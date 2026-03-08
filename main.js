const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const STORE_FILE = 'store.json';
const LOG_FILE = 'app.log';

function getLogPath() {
  return path.join(app.getPath('userData'), LOG_FILE);
}

function getLogsExportPath() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(app.getPath('downloads'), `redmine-app-logs-${stamp}.json`);
}

function readLogEntries() {
  const logPath = getLogPath();
  if (!fs.existsSync(logPath)) {
    return [];
  }

  const content = fs.readFileSync(logPath, 'utf8');
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function filterLogEntries(entries, filters = {}) {
  const level = String(filters.level || '').trim().toLowerCase();
  const source = String(filters.source || '').trim().toLowerCase();
  const errorType = String(filters.errorType || '').trim().toLowerCase();
  const query = String(filters.query || '').trim().toLowerCase();
  const dateFrom = String(filters.dateFrom || '').trim();
  const dateTo = String(filters.dateTo || '').trim();

  return entries.filter((entry) => {
    const entryLevel = String(entry.level || '').toLowerCase();
    const entrySource = String(entry.source || '').toLowerCase();
    const entryErrorType = String(entry?.details?.error?.name || '').toLowerCase();
    const entryTs = String(entry.ts || '');
    const entryDate = entryTs.slice(0, 10);

    if (level && entryLevel !== level) {
      return false;
    }

    if (source && entrySource !== source) {
      return false;
    }

    if (errorType && entryErrorType !== errorType) {
      return false;
    }

    if (dateFrom && (!entryDate || entryDate < dateFrom)) {
      return false;
    }

    if (dateTo && (!entryDate || entryDate > dateTo)) {
      return false;
    }

    if (query) {
      const haystack = `${entry.message || ''} ${entry.source || ''} ${JSON.stringify(entry.details || {})}`.toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }

    return true;
  });
}

function serializeError(error) {
  if (!error) {
    return { message: 'Unknown error' };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  return {
    message: error.message || 'Unexpected error',
    stack: error.stack || '',
    name: error.name || 'Error',
  };
}

function writeLog(level, source, message, details) {
  try {
    const payload = {
      ts: new Date().toISOString(),
      level,
      source,
      message,
      details: details || null,
    };
    fs.appendFileSync(getLogPath(), `${JSON.stringify(payload)}\n`, 'utf8');
  } catch (error) {
    console.error('Failed to write app log:', error);
  }
}

function logInfo(source, message, details) {
  writeLog('info', source, message, details);
}

function logError(source, error, details) {
  writeLog('error', source, normalizeError(error), {
    error: serializeError(error),
    ...(details || {}),
  });
}

function getStorePath() {
  return path.join(app.getPath('userData'), STORE_FILE);
}

const defaultStore = {
  config: {
    baseUrl: '',
    apiKey: '',
    userId: '',
    defaultActivityId: '',
    issueQuery: 'assigned_to_id=me&status_id=open&sort=updated_on:desc',
    themeMode: 'dark',
  },
  activeTimer: null,
};

function readStore() {
  const storePath = getStorePath();
  if (!fs.existsSync(storePath)) {
    return structuredClone(defaultStore);
  }

  try {
    const content = fs.readFileSync(storePath, 'utf8');
    const parsed = JSON.parse(content);
    return {
      ...defaultStore,
      ...parsed,
      config: {
        ...defaultStore.config,
        ...(parsed.config || {}),
      },
    };
  } catch (error) {
    logError('store:read', error);
    return structuredClone(defaultStore);
  }
}

function writeStore(store) {
  const storePath = getStorePath();
  try {
    fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
  } catch (error) {
    logError('store:write', error);
    throw error;
  }
}

function sanitizeBaseUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

function parseIssueQuery(rawQuery) {
  const query = String(rawQuery || '').trim();
  if (!query) {
    return defaultStore.config.issueQuery;
  }

  return query.replace(/^\?/, '');
}

function normalizeError(error) {
  if (!error) {
    return 'Unknown error';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error.message) {
    return error.message;
  }

  return 'Unexpected error';
}

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

  const url = `${sanitizeBaseUrl(baseUrl)}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'X-Redmine-API-Key': apiKey,
  };

  const response = await fetch(url, {
    method,
    headers,
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

function createWindow() {
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    minWidth: 1000,
    minHeight: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile('index.html');
}

function getElapsedSeconds(activeTimer) {
  if (!activeTimer?.startedAt) {
    return 0;
  }

  const started = new Date(activeTimer.startedAt).getTime();
  if (Number.isNaN(started)) {
    return 0;
  }

  return Math.max(0, Math.floor((Date.now() - started) / 1000));
}

function registerIpcHandlers() {
  ipcMain.handle('log:renderer', (_, entry) => {
    const level = entry?.level === 'error' ? 'error' : 'info';
    writeLog(level, `renderer:${entry?.source || 'ui'}`, entry?.message || '', entry?.details || null);
    return true;
  });

  ipcMain.handle('config:get', () => {
    const store = readStore();
    return store.config;
  });

  ipcMain.handle('logs:list', (_, filters) => {
    try {
      const entries = readLogEntries().reverse();
      const filtered = filterLogEntries(entries, filters).slice(0, 1000);
      const sources = [...new Set(entries.map((entry) => entry.source).filter(Boolean))].sort();
      const errorTypes = [...new Set(entries.map((entry) => entry?.details?.error?.name).filter(Boolean))].sort();

      return {
        ok: true,
        logs: filtered,
        sources,
        errorTypes,
        filePath: getLogPath(),
      };
    } catch (error) {
      logError('logs:list', error);
      return { ok: false, message: normalizeError(error), logs: [], sources: [], errorTypes: [] };
    }
  });

  ipcMain.handle('logs:export', (_, filters) => {
    try {
      const entries = readLogEntries().reverse();
      const filtered = filterLogEntries(entries, filters);
      const exportPath = getLogsExportPath();
      fs.writeFileSync(exportPath, JSON.stringify(filtered, null, 2), 'utf8');
      logInfo('logs:export', 'Logs exported', { exportPath, count: filtered.length });
      return { ok: true, path: exportPath, count: filtered.length };
    } catch (error) {
      logError('logs:export', error);
      return { ok: false, message: normalizeError(error) };
    }
  });

  ipcMain.handle('logs:clear', () => {
    try {
      fs.writeFileSync(getLogPath(), '', 'utf8');
      return { ok: true };
    } catch (error) {
      logError('logs:clear', error);
      return { ok: false, message: normalizeError(error) };
    }
  });

  ipcMain.handle('external:open', async (_, rawUrl) => {
    try {
      const url = String(rawUrl || '').trim();
      if (!/^https?:\/\//i.test(url)) {
        throw new Error('Only HTTP/HTTPS URLs are allowed.');
      }

      await shell.openExternal(url);
      return { ok: true };
    } catch (error) {
      logError('external:open', error, { url: rawUrl });
      return { ok: false, message: normalizeError(error) };
    }
  });

  ipcMain.handle('config:save', (_, inputConfig) => {
    const store = readStore();
    store.config = {
      ...store.config,
      ...inputConfig,
      baseUrl: sanitizeBaseUrl(inputConfig.baseUrl ?? store.config.baseUrl),
      issueQuery: parseIssueQuery(inputConfig.issueQuery ?? store.config.issueQuery),
      themeMode: ['dark', 'light', 'pink'].includes(inputConfig.themeMode)
        ? inputConfig.themeMode
        : (store.config.themeMode || 'dark'),
    };
    writeStore(store);
    return store.config;
  });

  ipcMain.handle('timer:get', () => {
    const store = readStore();
    const activeTimer = store.activeTimer;

    if (!activeTimer) {
      return null;
    }

    return {
      ...activeTimer,
      elapsedSeconds: getElapsedSeconds(activeTimer),
    };
  });

  ipcMain.handle('timer:start', (_, timerInput) => {
    const store = readStore();
    const timer = {
      issueId: Number(timerInput.issueId),
      issueSubject: String(timerInput.issueSubject || ''),
      projectName: String(timerInput.projectName || ''),
      startedAt: new Date().toISOString(),
      comment: String(timerInput.comment || '').trim(),
    };

    store.activeTimer = timer;
    writeStore(store);

    return {
      ...timer,
      elapsedSeconds: 0,
    };
  });

  ipcMain.handle('timer:discard', () => {
    const store = readStore();
    store.activeTimer = null;
    writeStore(store);
    return true;
  });

  ipcMain.handle('issues:fetch', async () => {
    try {
      const store = readStore();
      const { baseUrl, apiKey, issueQuery } = store.config;
      const endpoint = `/issues.json?limit=100&${parseIssueQuery(issueQuery)}`;
      const payload = await redmineRequest({ baseUrl, apiKey, endpoint });
    
      const issues = (payload?.issues || []).map((issue) => ({
        id: issue.id,
        subject: issue.subject,
        status: issue.status?.name || 'Unknown',
        project: issue.project?.name || 'No project',
        tracker: issue.tracker?.name || 'Issue',
        spentHours: issue.spent_hours || 0,
        estimatedHours: issue.estimated_hours || 0,
        updatedOn: issue.updated_on,
      }));

      return { ok: true, issues };
    } catch (error) {
      logError('issues:fetch', error);
      return { ok: false, message: normalizeError(error) };
    }
  });

  ipcMain.handle('issue:fetch-detail', async (_, issueId) => {
    try {
      const store = readStore();
      const { baseUrl, apiKey } = store.config;
      const endpoint = `/issues/${Number(issueId)}.json?include=children,attachments,relations,journals,watchers,allowed_statuses`;
      const payload = await redmineRequest({ baseUrl, apiKey, endpoint });
      const issue = payload?.issue;

      if (!issue) {
        throw new Error('Issue details were not returned by Redmine.');
      }

      const detail = {
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
      };

      return { ok: true, issue: detail };
    } catch (error) {
      logError('issue:fetch-detail', error, { issueId: Number(issueId) });
      return { ok: false, message: normalizeError(error) };
    }
  });

  ipcMain.handle('time-entries:fetch', async (_, issueId) => {
    try {
      const store = readStore();
      const { baseUrl, apiKey } = store.config;
      const endpoint = `/time_entries.json?issue_id=${Number(issueId)}&limit=100&sort=spent_on:desc`;
      const payload = await redmineRequest({ baseUrl, apiKey, endpoint });

      const entries = (payload?.time_entries || []).map((entry) => ({
        id: entry.id,
        spentOn: entry.spent_on,
        hours: entry.hours,
        comments: entry.comments || '',
        activity: entry.activity?.name || '',
        user: entry.user?.name || '',
      }));

      return { ok: true, entries };
    } catch (error) {
      logError('time-entries:fetch', error, { issueId: Number(issueId) });
      return { ok: false, message: normalizeError(error) };
    }
  });

  ipcMain.handle('time-entries:create', async (_, payload) => {
    try {
      const store = readStore();
      const { baseUrl, apiKey, userId, defaultActivityId } = store.config;
      const hours = Number(payload.hours);

      if (!payload.issueId || !hours || hours <= 0) {
        throw new Error('Issue and hours are required to log time.');
      }

      const requestBody = {
        time_entry: {
          issue_id: Number(payload.issueId),
          hours,
          comments: String(payload.comments || '').trim(),
          activity_id: Number(payload.activityId || defaultActivityId || 0) || undefined,
          user_id: Number(payload.userId || userId || 0) || undefined,
          spent_on: payload.spentOn || new Date().toISOString().slice(0, 10),
        },
      };

      await redmineRequest({
        baseUrl,
        apiKey,
        endpoint: '/time_entries.json',
        method: 'POST',
        body: requestBody,
      });

      return { ok: true };
    } catch (error) {
      logError('time-entries:create', error, { payload });
      return { ok: false, message: normalizeError(error) };
    }
  });

  ipcMain.handle('timer:stop-and-log', async (_, payload) => {
    try {
      const store = readStore();
      const activeTimer = store.activeTimer;
      if (!activeTimer) {
        throw new Error('No active timer to stop.');
      }

      const elapsedSeconds = getElapsedSeconds(activeTimer);
      const hours = Number((elapsedSeconds / 3600).toFixed(2));
      if (!hours || hours <= 0) {
        throw new Error('Elapsed time is too short to log.');
      }

      const { baseUrl, apiKey, userId, defaultActivityId } = store.config;

      const requestBody = {
        time_entry: {
          issue_id: activeTimer.issueId,
          hours,
          comments: String(payload?.comments || activeTimer.comment || '').trim(),
          activity_id: Number(payload?.activityId || defaultActivityId || 0) || undefined,
          user_id: Number(payload?.userId || userId || 0) || undefined,
          spent_on: payload?.spentOn || new Date().toISOString().slice(0, 10),
        },
      };

      await redmineRequest({
        baseUrl,
        apiKey,
        endpoint: '/time_entries.json',
        method: 'POST',
        body: requestBody,
      });

      store.activeTimer = null;
      writeStore(store);

      return { ok: true, hours };
    } catch (error) {
      logError('timer:stop-and-log', error);
      return { ok: false, message: normalizeError(error) };
    }
  });
}

app.whenReady().then(() => {
  logInfo('app', 'Application starting');

  process.on('uncaughtException', (error) => {
    logError('process:uncaughtException', error);
  });

  process.on('unhandledRejection', (reason) => {
    logError('process:unhandledRejection', reason instanceof Error ? reason : new Error(String(reason)));
  });

  registerIpcHandlers();
  createWindow();

  app.on('render-process-gone', (_, webContents, details) => {
    logError('app:render-process-gone', new Error(details?.reason || 'Renderer process gone'), {
      details,
      url: webContents?.getURL?.() || '',
    });
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  logInfo('app', 'All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

