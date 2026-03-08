const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const STORE_FILE = 'store.json';

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
  } catch {
    return structuredClone(defaultStore);
  }
}

function writeStore(store) {
  const storePath = getStorePath();
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
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
  ipcMain.handle('config:get', () => {
    const store = readStore();
    return store.config;
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
      return { ok: false, message: normalizeError(error) };
    }
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
