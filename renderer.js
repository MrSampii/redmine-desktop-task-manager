const state = {
  config: null,
  issues: [],
  selectedIssueId: null,
  selectedIssueDetail: null,
  activeTimer: null,
  timerInterval: null,
  currentView: 'tasks',
  logsLoaded: false,
  logsSearchDebounce: null,
};

const els = {
  menuToggle: document.getElementById('menuToggle'),
  menuPanel: document.getElementById('menuPanel'),
  viewTasksBtn: document.getElementById('viewTasksBtn'),
  viewDetailBtn: document.getElementById('viewDetailBtn'),
  viewLogsBtn: document.getElementById('viewLogsBtn'),
  viewSettingsBtn: document.getElementById('viewSettingsBtn'),
  tasksView: document.getElementById('tasksView'),
  detailView: document.getElementById('detailView'),
  logsView: document.getElementById('logsView'),
  settingsView: document.getElementById('settingsView'),

  detailTitle: document.getElementById('detailTitle'),
  detailStatus: document.getElementById('detailStatus'),
  detailFacts: document.getElementById('detailFacts'),
  detailDescription: document.getElementById('detailDescription'),
  detailAttachments: document.getElementById('detailAttachments'),
  detailExtra: document.getElementById('detailExtra'),

  configForm: document.getElementById('configForm'),
  baseUrl: document.getElementById('baseUrl'),
  apiKey: document.getElementById('apiKey'),
  userId: document.getElementById('userId'),
  activityId: document.getElementById('activityId'),
  issueQuery: document.getElementById('issueQuery'),
  themeMode: document.getElementById('themeMode'),
  configStatus: document.getElementById('configStatus'),

  refreshBtn: document.getElementById('refreshBtn'),
  issuesCount: document.getElementById('issuesCount'),
  issuesList: document.getElementById('issuesList'),
  globalStatus: document.getElementById('globalStatus'),

  timerIssue: document.getElementById('timerIssue'),
  timerElapsed: document.getElementById('timerElapsed'),
  timerComment: document.getElementById('timerComment'),
  timerSpentOn: document.getElementById('timerSpentOn'),
  timerActivityId: document.getElementById('timerActivityId'),
  stopAndLogBtn: document.getElementById('stopAndLogBtn'),
  discardTimerBtn: document.getElementById('discardTimerBtn'),
  timerStatus: document.getElementById('timerStatus'),

  manualIssueId: document.getElementById('manualIssueId'),
  manualHours: document.getElementById('manualHours'),
  manualSpentOn: document.getElementById('manualSpentOn'),
  manualComment: document.getElementById('manualComment'),
  manualActivityId: document.getElementById('manualActivityId'),
  logManualBtn: document.getElementById('logManualBtn'),
  manualStatus: document.getElementById('manualStatus'),

  selectedIssueLabel: document.getElementById('selectedIssueLabel'),
  loadEntriesBtn: document.getElementById('loadEntriesBtn'),
  entriesBody: document.getElementById('entriesBody'),

  logsPath: document.getElementById('logsPath'),
  logsRefreshBtn: document.getElementById('logsRefreshBtn'),
  logsClearBtn: document.getElementById('logsClearBtn'),
  logsExportBtn: document.getElementById('logsExportBtn'),
  logLevelFilter: document.getElementById('logLevelFilter'),
  logSourceFilter: document.getElementById('logSourceFilter'),
  logErrorTypeFilter: document.getElementById('logErrorTypeFilter'),
  logDateFrom: document.getElementById('logDateFrom'),
  logDateTo: document.getElementById('logDateTo'),
  logSearchFilter: document.getElementById('logSearchFilter'),
  logsBody: document.getElementById('logsBody'),
  logsStatus: document.getElementById('logsStatus'),
};

function e(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

function formatTs(iso) {
  if (!iso) {
    return '-';
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}

function appendApiKey(url) {
  const apiKey = String(state.config?.apiKey || '').trim();
  const baseUrl = String(state.config?.baseUrl || '').trim();
  if (!apiKey || !baseUrl) {
    return url;
  }

  try {
    const target = new URL(url);
    const base = new URL(baseUrl);

    // Only append API key for same-origin Redmine URLs.
    if (target.origin !== base.origin) {
      return url;
    }

    if (target.searchParams.has('key')) {
      return target.toString();
    }

    target.searchParams.set('key', apiKey);
    return target.toString();
  } catch {
    return url;
  }
}

function resolveDescriptionUrl(rawUrl) {
  const value = String(rawUrl || '').trim();
  if (!value) {
    return '';
  }

  if (/^(data:|blob:)/i.test(value)) {
    return value;
  }

  const baseUrl = String(state.config?.baseUrl || '').trim();

  try {
    let absolute;
    if (/^https?:\/\//i.test(value)) {
      absolute = new URL(value);
    } else if (baseUrl) {
      // Handles /path, ./path, ../path and plain relative paths.
      absolute = new URL(value, `${baseUrl.replace(/\/+$/, '')}/`);
    } else {
      return value;
    }

    return appendApiKey(absolute.toString());
  } catch {
    return value;
  }
}

function findAttachmentUrlByReference(reference, issue) {
  const ref = String(reference || '').trim();
  if (!ref) {
    return '';
  }

  const attachments = issue?.attachments || [];
  const byName = attachments.find((item) => String(item.filename || '').toLowerCase() === ref.toLowerCase());
  if (byName?.contentUrl) {
    return byName.contentUrl;
  }

  return '';
}

function sanitizeDescriptionHtml(rawDescription, issue) {
  const source = String(rawDescription || '').trim();
  if (!source) {
    return '<span class="meta">No description available.</span>';
  }

  let normalized = source;
  normalized = normalized.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
    const mapped = findAttachmentUrlByReference(src, issue) || src;
    return `<img alt="${e(alt)}" src="${e(mapped)}" />`;
  });
  normalized = normalized.replace(/!([^!\s]+)!/g, (_, ref) => {
    const mapped = findAttachmentUrlByReference(ref, issue) || ref;
    return `<img src="${e(mapped)}" alt="embedded image" />`;
  });

  const maybeHtml = /<\s*[a-z][\s\S]*>/i.test(normalized);
  const inputHtml = maybeHtml ? normalized : normalized.replace(/\n/g, '<br>');

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${inputHtml}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) {
    return '<span class="meta">No description available.</span>';
  }

  const blockedTags = ['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta'];
  root.querySelectorAll(blockedTags.join(',')).forEach((node) => node.remove());

  root.querySelectorAll('*').forEach((node) => {
    [...node.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value;

      if (name.startsWith('on')) {
        node.removeAttribute(attr.name);
        return;
      }

      if (name === 'style') {
        node.removeAttribute(attr.name);
        return;
      }

      if (node.tagName.toLowerCase() === 'a' && name === 'href') {
        const href = resolveDescriptionUrl(value);
        if (!/^https?:\/\//i.test(href)) {
          node.removeAttribute(attr.name);
          return;
        }

        node.setAttribute('href', href);
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
        return;
      }

      if (node.tagName.toLowerCase() === 'img' && name === 'src') {
        const src = resolveDescriptionUrl(value);
        if (!src) {
          node.remove();
          return;
        }

        node.setAttribute('src', src);
        node.setAttribute('loading', 'lazy');
        return;
      }

      if (!['href', 'src', 'alt', 'title', 'target', 'rel', 'loading'].includes(name)) {
        node.removeAttribute(attr.name);
      }
    });
  });

  return root.innerHTML || '<span class="meta">No description available.</span>';
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (!value) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let idx = 0;
  while (size >= 1024 && idx < units.length - 1) {
    size /= 1024;
    idx += 1;
  }

  return `${size.toFixed(size >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function buildAttachmentAccessUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) {
    return '';
  }

  if (!state.config?.apiKey) {
    return raw;
  }

  const separator = raw.includes('?') ? '&' : '?';
  return `${raw}${separator}key=${encodeURIComponent(state.config.apiKey)}`;
}

function isImageAttachment(attachment) {
  const type = String(attachment?.contentType || '').toLowerCase();
  if (type.startsWith('image/')) {
    return true;
  }

  const filename = String(attachment?.filename || '').toLowerCase();
  return /\.(png|jpg|jpeg|gif|bmp|webp|svg)$/.test(filename);
}

async function openAttachmentUrl(rawUrl) {
  const url = buildAttachmentAccessUrl(rawUrl);
  if (!url) {
    setStatus(els.detailStatus, 'Attachment URL is missing.', 'error');
    return;
  }

  try {
    const result = await window.redmineApi.openExternal(url);
    if (!result?.ok) {
      setStatus(els.detailStatus, result?.message || 'Unable to open attachment.', 'error');
    }
  } catch (error) {
    logClient('error', 'openAttachmentUrl', normalizeRendererError(error), { url });
    setStatus(els.detailStatus, 'Unexpected error opening attachment.', 'error');
  }
}

function setStatus(el, text, type = '') {
  el.textContent = text || '';
  el.className = `status ${type}`.trim();
}

function normalizeRendererError(error) {
  if (!error) {
    return 'Unknown error';
  }

  if (typeof error === 'string') {
    return error;
  }

  return error.message || 'Unexpected error';
}

function logClient(level, source, message, details = null) {
  try {
    const method = level === 'error' ? 'error' : 'log';
    console[method](`[${source}] ${message}`, details || '');
    window.redmineApi.logClientEvent({ level, source, message, details });
  } catch (error) {
    console.error('Failed to log client event', error);
  }
}

function applyTheme(themeMode) {
  const theme = ['dark', 'light', 'pink'].includes(themeMode) ? themeMode : 'dark';
  document.body.dataset.theme = theme;
}

function setMenuOpen(isOpen) {
  els.menuPanel.classList.toggle('open', isOpen);
  els.menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}

function switchView(viewName) {
  const allowedViews = ['tasks', 'detail', 'logs', 'settings'];
  const nextView = allowedViews.includes(viewName) ? viewName : 'tasks';
  state.currentView = nextView;

  els.tasksView.classList.toggle('active', nextView === 'tasks');
  els.detailView.classList.toggle('active', nextView === 'detail');
  els.logsView.classList.toggle('active', nextView === 'logs');
  els.settingsView.classList.toggle('active', nextView === 'settings');
  els.viewTasksBtn.classList.toggle('active', nextView === 'tasks');
  els.viewDetailBtn.classList.toggle('active', nextView === 'detail');
  els.viewLogsBtn.classList.toggle('active', nextView === 'logs');
  els.viewSettingsBtn.classList.toggle('active', nextView === 'settings');

  if (nextView === 'logs' && !state.logsLoaded) {
    loadLogs();
  }

  setMenuOpen(false);
}

function fillConfig(config) {
  els.baseUrl.value = config.baseUrl || '';
  els.apiKey.value = config.apiKey || '';
  els.userId.value = config.userId || '';
  els.activityId.value = config.defaultActivityId || '';
  els.issueQuery.value = config.issueQuery || '';
  els.themeMode.value = config.themeMode || 'dark';
  applyTheme(config.themeMode || 'dark');

  if (!els.timerActivityId.value) {
    els.timerActivityId.value = config.defaultActivityId || '';
  }

  if (!els.manualActivityId.value) {
    els.manualActivityId.value = config.defaultActivityId || '';
  }
}

function renderIssueDetail(issue) {
  if (!issue) {
    els.detailTitle.textContent = 'No issue selected';
    els.selectedIssueLabel.textContent = 'Choose an issue from Tasks.';
    els.detailFacts.innerHTML = '';
    els.detailDescription.innerHTML = '<span class="meta">No description available.</span>';
    els.detailAttachments.textContent = 'No attachments.';
    els.detailExtra.textContent = 'No extra data available.';
    return;
  }

  els.detailTitle.textContent = `#${issue.id} ${issue.subject}`;
  els.selectedIssueLabel.textContent = `${issue.project} | ${issue.tracker} | ${issue.status}`;

  const facts = [
    ['Priority', issue.priority],
    ['Assigned To', issue.assignedTo],
    ['Author', issue.author],
    ['Done Ratio', `${issue.doneRatio}%`],
    ['Estimated Hours', issue.estimatedHours],
    ['Spent Hours', issue.spentHours],
    ['Total Spent Hours', issue.totalSpentHours],
    ['Start Date', issue.startDate],
    ['Due Date', issue.dueDate],
    ['Created On', issue.createdOn],
    ['Updated On', issue.updatedOn],
    ['Closed On', issue.closedOn],
  ];

  els.detailFacts.innerHTML = facts
    .map(([label, value]) => `<div class="fact-item"><span class="meta">${e(label)}</span><strong>${e(value || '-')}</strong></div>`)
    .join('');

  els.detailDescription.innerHTML = sanitizeDescriptionHtml(issue.description, issue);

  const attachments = issue.attachments || [];
  if (!attachments.length) {
    els.detailAttachments.textContent = 'No attachments.';
  } else {
    els.detailAttachments.innerHTML = attachments
      .map((attachment, idx) => {
        const image = isImageAttachment(attachment);
        const previewUrl = buildAttachmentAccessUrl(attachment.thumbnailUrl || attachment.contentUrl);
        const preview = image && previewUrl
          ? `<img class=\"attachment-preview\" src=\"${e(previewUrl)}\" alt=\"${e(attachment.filename)}\" />`
          : '<div class=\"attachment-file-icon\">FILE</div>';

        return `
          <div class=\"attachment-card\">
            ${preview}
            <div class=\"attachment-meta\">
              <div class=\"attachment-name\">${e(attachment.filename || 'unnamed')}</div>
              <div class=\"meta\">${e(formatBytes(attachment.filesize))} | ${e(attachment.contentType || 'file')}</div>
              <div class=\"meta\">${e(attachment.author || '-')} | ${e(formatTs(attachment.createdOn))}</div>
            </div>
            <div class=\"row\">
              <button type=\"button\" class=\"secondary\" data-action=\"open-attachment\" data-index=\"${idx}\">Open</button>
            </div>
          </div>
        `;
      })
      .join('');
  }

  const extraData = [
    `Watchers: ${(issue.watchers || []).join(', ') || 'None'}`,
    `Children: ${(issue.children || []).map((child) => `#${child.id} ${child.subject}`).join(' | ') || 'None'}`,
    `Relations: ${(issue.relations || []).map((rel) => `${rel.relationType} #${rel.issueToId}`).join(' | ') || 'None'}`,
    `Custom Fields: ${(issue.customFields || []).map((cf) => `${cf.name}: ${cf.value || '-'}`).join(' | ') || 'None'}`,
    `Journals: ${issue.journalsCount || 0}`,
  ];

  els.detailExtra.textContent = extraData.join('\n');
}

function renderIssues() {
  els.issuesList.innerHTML = '';
  els.issuesCount.textContent = `${state.issues.length} loaded`;

  if (state.issues.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'block';
    empty.textContent = 'No issues found for the current query.';
    els.issuesList.appendChild(empty);
    return;
  }

  for (const issue of state.issues) {
    const card = document.createElement('div');
    card.className = 'issue';

    card.innerHTML = `
      <div class="issue-header">
        <div>
          <div class="issue-id">#${e(issue.id)} ${e(issue.tracker)}</div>
          <div>${e(issue.subject)}</div>
        </div>
        <span class="badge">${e(issue.status)}</span>
      </div>
      <div class="meta">${e(issue.project)} | Spent ${e(issue.spentHours)}h | Est. ${e(issue.estimatedHours || '-')}h</div>
      <div class="row">
        <button data-action="start" data-id="${issue.id}">Start timer</button>
        <button class="secondary icon-btn" data-action="detail" data-id="${issue.id}" title="More information" aria-label="More information">
          <span class="icon-circle">i</span>
        </button>
      </div>
    `;

    els.issuesList.appendChild(card);
  }
}

function findIssue(issueId) {
  return state.issues.find((issue) => issue.id === Number(issueId));
}

function renderTimer() {
  const active = state.activeTimer;
  if (!active) {
    els.timerIssue.textContent = 'No timer running';
    els.timerElapsed.textContent = '00:00:00';
    els.stopAndLogBtn.disabled = true;
    els.discardTimerBtn.disabled = true;
    return;
  }

  els.timerIssue.innerHTML = `<span class="timer-running">Running</span> #${e(active.issueId)} ${e(active.issueSubject)}`;
  els.timerElapsed.textContent = formatDuration(active.elapsedSeconds || 0);
  els.stopAndLogBtn.disabled = false;
  els.discardTimerBtn.disabled = false;
}

function getLogsFilters() {
  return {
    level: els.logLevelFilter.value,
    source: els.logSourceFilter.value,
    errorType: els.logErrorTypeFilter.value,
    dateFrom: els.logDateFrom.value,
    dateTo: els.logDateTo.value,
    query: els.logSearchFilter.value,
  };
}

function fillSelectOptions(selectEl, values) {
  const previous = selectEl.value;
  const firstOption = selectEl.options[0]?.outerHTML || '<option value="">All</option>';
  const optionsHtml = values.map((value) => `<option value="${e(value)}">${e(value)}</option>`).join('');
  selectEl.innerHTML = `${firstOption}${optionsHtml}`;

  if ([...selectEl.options].some((opt) => opt.value === previous)) {
    selectEl.value = previous;
  }
}

function renderLogsTable(logs) {
  els.logsBody.innerHTML = '';

  if (!logs.length) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="5" class="meta">No logs found with current filters.</td>';
    els.logsBody.appendChild(row);
    return;
  }

  for (const log of logs) {
    const tr = document.createElement('tr');
    const errorType = log?.details?.error?.name || '-';
    tr.innerHTML = `
      <td>${e(formatTs(log.ts))}</td>
      <td><span class="log-level ${e(log.level)}">${e(log.level || '-')}</span></td>
      <td>${e(log.source || '-')}</td>
      <td>${e(errorType)}</td>
      <td>${e(log.message || '-')}</td>
    `;
    els.logsBody.appendChild(tr);
  }
}

async function loadLogs() {
  setStatus(els.logsStatus, 'Loading logs...');
  const filters = getLogsFilters();

  try {
    const result = await window.redmineApi.listLogs(filters);
    if (!result.ok) {
      setStatus(els.logsStatus, result.message || 'Failed to load logs.', 'error');
      return;
    }

    fillSelectOptions(els.logSourceFilter, result.sources || []);
    fillSelectOptions(els.logErrorTypeFilter, result.errorTypes || []);
    renderLogsTable(result.logs || []);
    els.logsPath.textContent = `Log file path: ${result.filePath || '-'}`;
    setStatus(els.logsStatus, `Showing ${result.logs.length} log entries.`, 'ok');
    state.logsLoaded = true;
  } catch (error) {
    logClient('error', 'loadLogs', normalizeRendererError(error));
    setStatus(els.logsStatus, 'Unexpected error loading logs.', 'error');
  }
}

async function exportLogs() {
  setStatus(els.logsStatus, 'Exporting logs...');
  try {
    const result = await window.redmineApi.exportLogs(getLogsFilters());
    if (!result.ok) {
      setStatus(els.logsStatus, result.message || 'Failed to export logs.', 'error');
      return;
    }

    setStatus(els.logsStatus, `Exported ${result.count} entries to ${result.path}`, 'ok');
  } catch (error) {
    logClient('error', 'exportLogs', normalizeRendererError(error));
    setStatus(els.logsStatus, 'Unexpected error exporting logs.', 'error');
  }
}

async function clearLogs() {
  const confirmed = window.confirm('This will permanently clear the current app logs. Continue?');
  if (!confirmed) {
    return;
  }

  setStatus(els.logsStatus, 'Clearing logs...');
  try {
    const result = await window.redmineApi.clearLogs();
    if (!result.ok) {
      setStatus(els.logsStatus, result.message || 'Failed to clear logs.', 'error');
      return;
    }

    state.logsLoaded = false;
    await loadLogs();
    setStatus(els.logsStatus, 'Logs cleared.', 'ok');
  } catch (error) {
    logClient('error', 'clearLogs', normalizeRendererError(error));
    setStatus(els.logsStatus, 'Unexpected error clearing logs.', 'error');
  }
}

function startTicker() {
  stopTicker();
  state.timerInterval = setInterval(async () => {
    const timer = await window.redmineApi.getTimer();
    state.activeTimer = timer;
    renderTimer();
  }, 1000);
}

function stopTicker() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

async function loadConfig() {
  try {
    const config = await window.redmineApi.getConfig();
    state.config = config;
    fillConfig(config);
  } catch (error) {
    logClient('error', 'loadConfig', normalizeRendererError(error));
    throw error;
  }
}

async function loadIssues() {
  setStatus(els.globalStatus, 'Loading issues...');
  const result = await window.redmineApi.fetchIssues();
  if (!result.ok) {
    setStatus(els.globalStatus, result.message, 'error');
    state.issues = [];
    renderIssues();
    return;
  }

  state.issues = result.issues;
  renderIssues();
  setStatus(els.globalStatus, `Loaded ${result.issues.length} issues`, 'ok');
}

async function restoreTimer() {
  try {
    state.activeTimer = await window.redmineApi.getTimer();
    renderTimer();
    startTicker();
  } catch (error) {
    logClient('error', 'restoreTimer', normalizeRendererError(error));
  }
}

function setSelectedIssue(issueId) {
  state.selectedIssueId = Number(issueId);
  const issue = findIssue(issueId);

  if (issue) {
    els.selectedIssueLabel.textContent = `Selected #${issue.id}: ${issue.subject}`;
    els.manualIssueId.value = String(issue.id);
  } else {
    els.selectedIssueLabel.textContent = `Selected issue #${issueId}`;
    els.manualIssueId.value = String(issueId);
  }

  els.viewDetailBtn.disabled = false;
}

async function openIssueDetail(issueId) {
  setSelectedIssue(issueId);
  setStatus(els.detailStatus, 'Loading issue detail...');
  let detailResult;
  try {
    detailResult = await window.redmineApi.fetchIssueDetail(Number(issueId));
  } catch (error) {
    logClient('error', 'openIssueDetail', normalizeRendererError(error), { issueId: Number(issueId) });
    setStatus(els.detailStatus, 'Unexpected error loading issue detail.', 'error');
    switchView('detail');
    return;
  }

  if (!detailResult.ok) {
    state.selectedIssueDetail = null;
    renderIssueDetail(null);
    setStatus(els.detailStatus, detailResult.message, 'error');
    switchView('detail');
    return;
  }

  state.selectedIssueDetail = detailResult.issue;
  renderIssueDetail(detailResult.issue);
  setStatus(els.detailStatus, 'Issue detail loaded.', 'ok');

  await loadEntries();
  switchView('detail');
}

async function handleStartTimer(issueId) {
  const issue = findIssue(issueId);
  if (!issue) {
    setStatus(els.timerStatus, 'Issue not found in loaded list.', 'error');
    return;
  }

  if (state.activeTimer) {
    setStatus(els.timerStatus, 'A timer is already running. Stop or discard it first.', 'error');
    return;
  }

  let timer;
  try {
    timer = await window.redmineApi.startTimer({
      issueId: issue.id,
      issueSubject: issue.subject,
      projectName: issue.project,
      comment: issue.subject,
    });
  } catch (error) {
    logClient('error', 'handleStartTimer', normalizeRendererError(error), { issueId });
    setStatus(els.timerStatus, 'Unexpected error starting timer.', 'error');
    return;
  }

  state.activeTimer = timer;
  renderTimer();
  setSelectedIssue(issue.id);
  setStatus(els.timerStatus, `Timer started for issue #${issue.id}`, 'ok');
}

async function handleStopAndLog() {
  if (!state.activeTimer) {
    return;
  }

  setStatus(els.timerStatus, 'Logging tracked time...');
  const result = await window.redmineApi.stopAndLogTimer({
    comments: els.timerComment.value,
    spentOn: els.timerSpentOn.value || today(),
    activityId: els.timerActivityId.value,
  });

  if (!result.ok) {
    setStatus(els.timerStatus, result.message, 'error');
    return;
  }

  state.activeTimer = null;
  renderTimer();
  setStatus(els.timerStatus, `Logged ${result.hours}h and stopped timer.`, 'ok');
  await loadIssues();

  if (state.selectedIssueId) {
    await openIssueDetail(state.selectedIssueId);
  }
}

async function handleDiscardTimer() {
  try {
    await window.redmineApi.discardTimer();
    state.activeTimer = null;
    renderTimer();
    setStatus(els.timerStatus, 'Timer discarded without logging.', 'ok');
  } catch (error) {
    logClient('error', 'handleDiscardTimer', normalizeRendererError(error));
    setStatus(els.timerStatus, 'Unexpected error discarding timer.', 'error');
  }
}

async function loadEntries() {
  const issueId = Number(els.manualIssueId.value || state.selectedIssueId);
  if (!issueId) {
    setStatus(els.manualStatus, 'Choose or type an issue id first.', 'error');
    return;
  }

  setStatus(els.manualStatus, 'Loading time entries...');
  const result = await window.redmineApi.fetchTimeEntries(issueId);
  if (!result.ok) {
    setStatus(els.manualStatus, result.message, 'error');
    return;
  }

  els.entriesBody.innerHTML = '';
  for (const entry of result.entries) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${e(entry.spentOn)}</td>
      <td>${e(entry.hours)}</td>
      <td>${e(entry.activity)}</td>
      <td>${e(entry.comments || '')}</td>
      <td>${e(entry.user)}</td>
    `;
    els.entriesBody.appendChild(tr);
  }

  setStatus(els.manualStatus, `Loaded ${result.entries.length} entries.`, 'ok');
}

async function logManualTime() {
  const payload = {
    issueId: Number(els.manualIssueId.value),
    hours: Number(els.manualHours.value),
    spentOn: els.manualSpentOn.value || today(),
    comments: els.manualComment.value,
    activityId: els.manualActivityId.value,
  };

  setStatus(els.manualStatus, 'Logging time entry...');
  const result = await window.redmineApi.createTimeEntry(payload);
  if (!result.ok) {
    setStatus(els.manualStatus, result.message, 'error');
    return;
  }

  setStatus(els.manualStatus, 'Time entry logged successfully.', 'ok');
  els.manualHours.value = '';
  await loadIssues();
  await loadEntries();

  if (payload.issueId) {
    await openIssueDetail(payload.issueId);
  }
}

function bindEvents() {
  els.configForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const config = {
      baseUrl: els.baseUrl.value,
      apiKey: els.apiKey.value,
      userId: els.userId.value,
      defaultActivityId: els.activityId.value,
      issueQuery: els.issueQuery.value,
      themeMode: els.themeMode.value,
    };

    try {
      const saved = await window.redmineApi.saveConfig(config);
      state.config = saved;
      setStatus(els.configStatus, 'Settings saved.', 'ok');
      await loadIssues();
      switchView('tasks');
    } catch (error) {
      logClient('error', 'saveConfig', normalizeRendererError(error));
      setStatus(els.configStatus, error.message || 'Failed to save settings.', 'error');
    }
  });

  els.refreshBtn.addEventListener('click', loadIssues);
  els.themeMode.addEventListener('change', () => applyTheme(els.themeMode.value));

  els.menuToggle.addEventListener('click', () => {
    const isOpen = els.menuPanel.classList.contains('open');
    setMenuOpen(!isOpen);
  });

  els.viewTasksBtn.addEventListener('click', () => switchView('tasks'));
  els.viewDetailBtn.addEventListener('click', () => {
    if (state.selectedIssueId) {
      switchView('detail');
    }
  });
  els.viewLogsBtn.addEventListener('click', async () => {
    switchView('logs');
    await loadLogs();
  });
  els.viewSettingsBtn.addEventListener('click', () => switchView('settings'));

  document.addEventListener('click', (event) => {
    const clickedMenu = event.target.closest('#menuPanel, #menuToggle');
    if (!clickedMenu) {
      setMenuOpen(false);
    }
  });

  els.issuesList.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) {
      return;
    }

    const issueId = Number(button.dataset.id);
    if (button.dataset.action === 'start') {
      await handleStartTimer(issueId);
      return;
    }

    if (button.dataset.action === 'detail') {
      await openIssueDetail(issueId);
    }
  });

  els.detailAttachments.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action=\"open-attachment\"]');
    if (!button) {
      return;
    }

    const index = Number(button.dataset.index);
    const attachment = state.selectedIssueDetail?.attachments?.[index];
    if (!attachment) {
      setStatus(els.detailStatus, 'Attachment not found.', 'error');
      return;
    }

    await openAttachmentUrl(attachment.contentUrl);
  });

  els.stopAndLogBtn.addEventListener('click', handleStopAndLog);
  els.discardTimerBtn.addEventListener('click', handleDiscardTimer);
  els.logManualBtn.addEventListener('click', logManualTime);
  els.loadEntriesBtn.addEventListener('click', loadEntries);

  els.logsRefreshBtn.addEventListener('click', loadLogs);
  els.logsClearBtn.addEventListener('click', clearLogs);
  els.logsExportBtn.addEventListener('click', exportLogs);

  const applyLogsFilters = () => {
    loadLogs();
  };

  els.logLevelFilter.addEventListener('change', applyLogsFilters);
  els.logSourceFilter.addEventListener('change', applyLogsFilters);
  els.logErrorTypeFilter.addEventListener('change', applyLogsFilters);
  els.logDateFrom.addEventListener('change', applyLogsFilters);
  els.logDateTo.addEventListener('change', applyLogsFilters);
  els.logSearchFilter.addEventListener('input', () => {
    clearTimeout(state.logsSearchDebounce);
    state.logsSearchDebounce = setTimeout(applyLogsFilters, 250);
  });
}

async function init() {
  els.manualSpentOn.value = today();
  els.timerSpentOn.value = today();

  try {
    bindEvents();
    renderIssueDetail(null);
    await loadConfig();
    await restoreTimer();

    if (state.config.baseUrl && state.config.apiKey) {
      await loadIssues();
      switchView('tasks');
    } else {
      setStatus(els.globalStatus, 'Configure Redmine URL and API key to start.', 'error');
      switchView('settings');
    }
  } catch (error) {
    logClient('error', 'init', normalizeRendererError(error));
    setStatus(els.globalStatus, 'Unexpected startup error. Check logs.', 'error');
    switchView('settings');
  }
}

window.addEventListener('error', (event) => {
  logClient('error', 'window:error', event.message || 'Unhandled window error', {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  logClient('error', 'window:unhandledrejection', normalizeRendererError(event.reason));
});

window.addEventListener('beforeunload', stopTicker);
window.addEventListener('DOMContentLoaded', init);
