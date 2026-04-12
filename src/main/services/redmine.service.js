const { defaultStore } = require('../../shared/constants/store');
const { normalizeError } = require('../../shared/utils/errors');
const { parseIssueQuery } = require('../../shared/utils/redmine');
const { logError } = require('./logger.service');
const { getConfig } = require('./store.service');
const { getElapsedSeconds } = require('./timer.service');

async function redmineRequest({
  baseUrl,
  apiKey,
  endpoint,
  method = 'GET',
  body,
}) {
  if (!baseUrl || !apiKey) {
    throw new Error('Redmine base URL and API key are required.');
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Redmine-API-Key': apiKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payloadText = await response.text();
  let payload;
  try {
    payload = payloadText ? JSON.parse(payloadText) : null;
  } catch {
    payload = { raw: payloadText };
  }

  if (!response.ok) {
    const apiMessage = payload?.error || payload?.message || payload?.errors?.join(', ');
    logError('redmine:request', new Error(`HTTP ${response.status}`), {
      endpoint,
      method,
      status: response.status,
      statusText: response.statusText,
      apiMessage,
    });
    throw new Error(`Redmine request failed (${response.status}): ${apiMessage || response.statusText}`);
  }

  return payload;
}

async function fetchIssues() {
  try {
    const { baseUrl, apiKey, issueQuery } = getConfig();
    const endpoint = `/issues.json?limit=100&${parseIssueQuery(issueQuery, defaultStore.config.issueQuery)}`;
    const payload = await redmineRequest({ baseUrl, apiKey, endpoint });

    return {
      ok: true,
      issues: (payload?.issues || []).map((issue) => ({
        id: issue.id,
        subject: issue.subject,
        status: issue.status?.name || 'Unknown',
        project: issue.project?.name || 'No project',
        tracker: issue.tracker?.name || 'Issue',
        spentHours: issue.spent_hours || 0,
        estimatedHours: issue.estimated_hours || 0,
        updatedOn: issue.updated_on,
      })),
    };
  } catch (error) {
    logError('issues:fetch', error);
    return { ok: false, message: normalizeError(error) };
  }
}

async function fetchIssueDetail(issueId) {
  try {
    const { baseUrl, apiKey } = getConfig();
    const endpoint = `/issues/${Number(issueId)}.json?include=children,attachments,relations,journals,watchers,allowed_statuses`;
    const payload = await redmineRequest({ baseUrl, apiKey, endpoint });
    const issue = payload?.issue;

    if (!issue) {
      throw new Error('Issue details were not returned by Redmine.');
    }

    return {
      ok: true,
      issue: {
        id: issue.id,
        subject: issue.subject || '',
        description: issue.description || '',
        project: issue.project?.name || '',
        tracker: issue.tracker?.name || '',
        status: issue.status?.name || '',
        priority: issue.priority?.name || '',
        author: issue.author?.name || '',
        assignedTo: issue.assigned_to?.name || '',
        doneRatio: issue.done_ratio ?? 0,
        startDate: issue.start_date || '',
        dueDate: issue.due_date || '',
        createdOn: issue.created_on || '',
        updatedOn: issue.updated_on || '',
        closedOn: issue.closed_on || '',
        estimatedHours: issue.estimated_hours ?? 0,
        spentHours: issue.spent_hours ?? 0,
        totalSpentHours: issue.total_spent_hours ?? 0,
        customFields: (issue.custom_fields || []).map((field) => ({
          name: field.name,
          value: Array.isArray(field.value) ? field.value.join(', ') : String(field.value || ''),
        })),
        children: (issue.children || []).map((child) => ({
          id: child.id,
          subject: child.subject || '',
        })),
        attachments: (issue.attachments || []).map((item) => ({
          id: item.id,
          filename: item.filename || '',
          filesize: item.filesize || 0,
          contentType: item.content_type || '',
          contentUrl: item.content_url || '',
          thumbnailUrl: item.thumbnail_url || '',
          description: item.description || '',
          downloads: item.downloads || 0,
          author: item.author?.name || '',
          createdOn: item.created_on || '',
        })),
        relations: (issue.relations || []).map((rel) => ({
          issueId: rel.issue_id,
          issueToId: rel.issue_to_id,
          relationType: rel.relation_type || '',
          delay: rel.delay || 0,
        })),
        watchers: (issue.watchers || []).map((watcher) => watcher.name),
        journalsCount: (issue.journals || []).length,
      },
    };
  } catch (error) {
    logError('issue:fetch-detail', error, { issueId: Number(issueId) });
    return { ok: false, message: normalizeError(error) };
  }
}

async function fetchTimeEntries(issueId) {
  try {
    const { baseUrl, apiKey } = getConfig();
    const payload = await redmineRequest({
      baseUrl,
      apiKey,
      endpoint: `/time_entries.json?issue_id=${Number(issueId)}&limit=100&sort=spent_on:desc`,
    });

    return {
      ok: true,
      entries: (payload?.time_entries || []).map((entry) => ({
        id: entry.id,
        spentOn: entry.spent_on,
        hours: entry.hours,
        comments: entry.comments || '',
        activity: entry.activity?.name || '',
        user: entry.user?.name || '',
      })),
    };
  } catch (error) {
    logError('time-entries:fetch', error, { issueId: Number(issueId) });
    return { ok: false, message: normalizeError(error) };
  }
}

async function createTimeEntry(payload) {
  try {
    const { baseUrl, apiKey, userId, defaultActivityId } = getConfig();
    const hours = Number(payload.hours);

    if (!payload.issueId || !hours || hours <= 0) {
      throw new Error('Issue and hours are required to log time.');
    }

    await redmineRequest({
      baseUrl,
      apiKey,
      endpoint: '/time_entries.json',
      method: 'POST',
      body: {
        time_entry: {
          issue_id: Number(payload.issueId),
          hours,
          comments: String(payload.comments || '').trim(),
          activity_id: Number(payload.activityId || defaultActivityId || 0) || undefined,
          user_id: Number(payload.userId || userId || 0) || undefined,
          spent_on: payload.spentOn || new Date().toISOString().slice(0, 10),
        },
      },
    });

    return { ok: true };
  } catch (error) {
    logError('time-entries:create', error, { payload });
    return { ok: false, message: normalizeError(error) };
  }
}

async function stopAndLogTimer(activeTimer, payload) {
  try {
    if (!activeTimer) {
      throw new Error('No active timer to stop.');
    }

    const elapsedSeconds = getElapsedSeconds(activeTimer);
    const hours = Number((elapsedSeconds / 3600).toFixed(2));
    if (!hours || hours <= 0) {
      throw new Error('Elapsed time is too short to log.');
    }

    const { baseUrl, apiKey, userId, defaultActivityId } = getConfig();
    await redmineRequest({
      baseUrl,
      apiKey,
      endpoint: '/time_entries.json',
      method: 'POST',
      body: {
        time_entry: {
          issue_id: activeTimer.issueId,
          hours,
          comments: String(payload?.comments || activeTimer.comment || '').trim(),
          activity_id: Number(payload?.activityId || defaultActivityId || 0) || undefined,
          user_id: Number(payload?.userId || userId || 0) || undefined,
          spent_on: payload?.spentOn || new Date().toISOString().slice(0, 10),
        },
      },
    });

    return { ok: true, hours };
  } catch (error) {
    logError('timer:stop-and-log', error);
    return { ok: false, message: normalizeError(error) };
  }
}

module.exports = {
  createTimeEntry,
  fetchIssueDetail,
  fetchIssues,
  fetchTimeEntries,
  redmineRequest,
  stopAndLogTimer,
};
