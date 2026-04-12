const fs = require('fs');
const path = require('path');
const http = require('http');
const { _electron: electron } = require('playwright');

const ROOT = process.cwd();
const SHOTS_DIR = path.join(ROOT, 'test-artifacts', 'electron-e2e-screenshots');
const REPORT_PATH = path.join(ROOT, 'test-artifacts', 'electron-e2e-report.json');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readMaybe(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

function writeJson(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function buildLaunchEnv() {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  return env;
}

async function launchApp() {
  return electron.launch({
    executablePath: require('electron'),
    args: ['.'],
    env: buildLaunchEnv(),
  });
}

async function clickNav(win, buttonSelector) {
  await win.click('#menuToggle');
  await win.click(buttonSelector);
}

async function capture(win, index, status) {
  ensureDir(SHOTS_DIR);
  const file = path.join(SHOTS_DIR, `${String(index).padStart(2, '0')}-${status}.png`);
  await win.screenshot({ path: file, fullPage: true, timeout: 5000 });
  return file;
}

function startMockServer() {
  const state = {
    issues: [
      {
        id: 101,
        subject: 'Fix login bug',
        status: { name: 'In Progress' },
        project: { name: 'Web App' },
        tracker: { name: 'Bug' },
        spent_hours: 2.5,
        estimated_hours: 5,
        updated_on: '2026-03-08T10:00:00Z',
      },
      {
        id: 102,
        subject: 'Implement dashboard',
        status: { name: 'New' },
        project: { name: 'Web App' },
        tracker: { name: 'Feature' },
        spent_hours: 0,
        estimated_hours: 8,
        updated_on: '2026-03-07T15:00:00Z',
      },
    ],
    entries: {
      101: [
        {
          id: 9001,
          spent_on: '2026-03-08',
          hours: 1.25,
          comments: 'Initial investigation',
          activity: { name: 'Development' },
          user: { name: 'QA Bot' },
        },
      ],
      102: [],
    },
    posted: [],
  };

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      const p = url.pathname;

      if (req.method === 'GET' && p === '/issues.json') {
        return json(res, 200, { issues: state.issues });
      }

      if (req.method === 'GET' && /^\/issues\/\d+\.json$/.test(p)) {
        const issueId = Number(p.match(/\d+/)[0]);
        const base = state.issues.find((x) => x.id === issueId);
        if (!base) return json(res, 404, { error: 'Issue not found' });
        return json(res, 200, {
          issue: {
            id: base.id,
            subject: base.subject,
            description: '<script>alert(1)</script><p>Hello <a href="/wiki/guide">guide</a> !mock.png!</p>',
            project: { name: base.project.name },
            tracker: { name: base.tracker.name },
            status: { name: base.status.name },
            priority: { name: 'High' },
            author: { name: 'Alice' },
            assigned_to: { name: 'Bob' },
            done_ratio: 40,
            start_date: '2026-03-01',
            due_date: '2026-03-30',
            created_on: '2026-03-01T10:00:00Z',
            updated_on: '2026-03-08T10:00:00Z',
            spent_hours: base.spent_hours,
            total_spent_hours: base.spent_hours,
            estimated_hours: base.estimated_hours,
            custom_fields: [{ name: 'Environment', value: 'Staging' }],
            children: [{ id: 202, subject: 'Child task' }],
            attachments: [
              {
                id: 5001,
                filename: 'mock.png',
                filesize: 1024,
                content_type: 'image/png',
                content_url: `http://127.0.0.1:${server.address().port}/attachments/mock.png`,
                thumbnail_url: `http://127.0.0.1:${server.address().port}/attachments/mock-thumb.png`,
                author: { name: 'Alice' },
                created_on: '2026-03-08T08:00:00Z',
              },
            ],
            relations: [{ issue_id: issueId, issue_to_id: 102, relation_type: 'relates' }],
            watchers: [{ name: 'Watcher 1' }],
            journals: [{ id: 1 }, { id: 2 }],
          },
        });
      }

      if (req.method === 'GET' && p === '/time_entries.json') {
        const issueId = Number(url.searchParams.get('issue_id') || 0);
        return json(res, 200, { time_entries: state.entries[issueId] || [] });
      }

      if (req.method === 'POST' && p === '/time_entries.json') {
        const body = await parseBody(req);
        const e = body?.time_entry || {};
        const issueId = Number(e.issue_id);
        if (!issueId || !Number(e.hours)) {
          return json(res, 422, { error: 'Invalid entry' });
        }
        const created = {
          id: 10000 + state.posted.length,
          spent_on: e.spent_on,
          hours: Number(e.hours),
          comments: e.comments || '',
          activity: { name: 'Development' },
          user: { name: 'QA Bot' },
          issue_id: issueId,
        };
        state.posted.push(created);
        if (!state.entries[issueId]) state.entries[issueId] = [];
        state.entries[issueId].unshift(created);
        return json(res, 201, { time_entry: created });
      }

      if (req.method === 'GET' && p.startsWith('/attachments/')) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'image/png');
        return res.end('PNG');
      }

      return json(res, 404, { error: 'Not found' });
    } catch (error) {
      return json(res, 500, { error: error.message || 'Server error' });
    }
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${server.address().port}`,
        state,
      });
    });
  });
}

async function run() {
  fs.rmSync(SHOTS_DIR, { recursive: true, force: true });
  ensureDir(SHOTS_DIR);

  const mock = await startMockServer();
  let bootstrapApp;
  let app;
  let userDataPath;
  let storePath;
  let logPath;
  let backupStore;
  let backupLog;
  const results = [];

  try {
    bootstrapApp = await launchApp();
    userDataPath = await bootstrapApp.evaluate(async ({ app: electronApp }) => electronApp.getPath('userData'));
    await bootstrapApp.close();
    bootstrapApp = null;

    storePath = path.join(userDataPath, 'store.json');
    logPath = path.join(userDataPath, 'app.log');
    backupStore = readMaybe(storePath);
    backupLog = readMaybe(logPath);

    const seededStore = {
      config: {
        baseUrl: mock.baseUrl,
        apiKey: 'mock-key',
        userId: '77',
        defaultActivityId: '9',
        issueQuery: 'assigned_to_id=me&status_id=open',
        themeMode: 'dark',
      },
      activeTimer: null,
    };
    writeJson(storePath, seededStore);

    app = await launchApp();
    const win = await app.firstWindow();
    await win.setViewportSize({ width: 1600, height: 1000 });

    const scenarios = [
      {
        name: 'startup loads issues from seeded config',
        run: async () => {
          await win.waitForSelector('#tasksView.active');
          await win.waitForFunction(() => document.querySelector('#issuesCount')?.textContent?.includes('2 loaded'));
        },
      },
      {
        name: 'settings save and theme apply',
        run: async () => {
          await clickNav(win, '#viewSettingsBtn');
          await win.waitForSelector('#settingsView.active');
          await win.selectOption('#themeMode', 'pink');
          await win.click('#configForm button[type="submit"]');
          await win.waitForFunction(() => document.querySelector('#configStatus')?.textContent?.includes('Settings saved.'));
          const theme = await win.evaluate(() => document.body.dataset.theme);
          assert(theme === 'pink', 'Theme should be pink');
          await win.waitForSelector('#tasksView.active');
        },
      },
      {
        name: 'start and discard timer',
        run: async () => {
          await win.click('button[data-action="start"][data-id="101"]');
          await win.waitForFunction(() => document.querySelector('#timerIssue')?.textContent?.includes('#101'));
          await win.click('#discardTimerBtn');
          await win.waitForFunction(() => document.querySelector('#timerStatus')?.textContent?.includes('discarded'));
        },
      },
      {
        name: 'timer too short validation',
        run: async () => {
          await win.click('button[data-action="start"][data-id="101"]');
          await win.waitForFunction(() => document.querySelector('#timerIssue')?.textContent?.includes('#101'));
          await win.click('#stopAndLogBtn');
          await win.waitForFunction(() => document.querySelector('#timerStatus')?.textContent?.toLowerCase().includes('too short'));
        },
      },
      {
        name: 'timer stop and log success',
        run: async () => {
          const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));
          store.activeTimer.startedAt = new Date(Date.now() - 40 * 60 * 1000).toISOString();
          fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
          await sleep(200);
          await win.fill('#timerComment', 'Timer tracked work');
          await win.click('#stopAndLogBtn');
          await win.waitForFunction(() => document.querySelector('#timerStatus')?.textContent?.includes('Logged'));
          assert(mock.state.posted.length >= 1, 'Expected timer entry posted to mock');
        },
      },
      {
        name: 'open issue detail and sanitize description',
        run: async () => {
          await clickNav(win, '#viewTasksBtn');
          await win.waitForSelector('#tasksView.active');
          await win.click('button[data-action="detail"][data-id="101"]');
          await win.waitForSelector('#detailView.active');
          await win.waitForFunction(() => document.querySelector('#detailTitle')?.textContent?.includes('#101'));
          const html = await win.locator('#detailDescription').innerHTML();
          assert(!html.toLowerCase().includes('<script'), 'Description sanitizer should remove script tags');
        },
      },
      {
        name: 'manual time entry validation failure',
        run: async () => {
          await win.fill('#manualIssueId', '101');
          await win.fill('#manualHours', '');
          await win.click('#logManualBtn');
          await win.waitForFunction(() => document.querySelector('#manualStatus')?.textContent?.toLowerCase().includes('required'));
        },
      },
      {
        name: 'manual time entry success',
        run: async () => {
          await win.fill('#manualIssueId', '101');
          await win.fill('#manualHours', '1.50');
          await win.fill('#manualComment', 'Manual QA entry');
          await win.fill('#manualActivityId', '9');
          await win.click('#logManualBtn');
          await win.waitForFunction(() => {
            const text = document.querySelector('#manualStatus')?.textContent?.toLowerCase() || '';
            return text.includes('successfully') || text.includes('loaded');
          });
          assert(mock.state.posted.length >= 2, 'Expected second posted entry from manual flow');
        },
      },
      {
        name: 'load entries for issue',
        run: async () => {
          await win.click('#loadEntriesBtn');
          await win.waitForFunction(() => document.querySelector('#manualStatus')?.textContent?.toLowerCase().includes('loaded'));
          const rows = await win.locator('#entriesBody tr').count();
          assert(rows >= 1, 'Expected entries table rows');
        },
      },
      {
        name: 'logs refresh export filter clear',
        run: async () => {
          await clickNav(win, '#viewLogsBtn');
          await win.waitForSelector('#logsView.active');
          await win.click('#logsRefreshBtn');
          await win.waitForFunction(() => document.querySelector('#logsStatus')?.textContent?.toLowerCase().includes('showing'));
          await win.click('#logsExportBtn');
          await win.waitForFunction(() => document.querySelector('#logsStatus')?.textContent?.toLowerCase().includes('exported'));
          const status = await win.locator('#logsStatus').innerText();
          const match = status.match(/to\s+(.+)$/i);
          assert(match && fs.existsSync(match[1]), 'Expected exported log file to exist');
          await win.selectOption('#logLevelFilter', 'error');
          await win.waitForFunction(() => document.querySelector('#logsStatus')?.textContent?.toLowerCase().includes('showing'));
          await win.evaluate(() => {
            window.confirm = () => true;
          });
          await win.click('#logsClearBtn');
          await win.waitForFunction(() => document.querySelector('#logsStatus')?.textContent?.toLowerCase().includes('logs cleared'));
        },
      },
      {
        name: 'external open URL validation',
        run: async () => {
          const result = await win.evaluate(async () => window.redmineApi.openExternal('javascript:alert(1)'));
          assert(result?.ok === false, 'Expected non-http URL rejection');
        },
      },
    ];

    for (let i = 0; i < scenarios.length; i += 1) {
      let status = 'pass';
      let error = null;
      let screenshot = null;
      console.log(`Running scenario ${i + 1}/${scenarios.length}: ${scenarios[i].name}`);
      try {
        await scenarios[i].run();
      } catch (err) {
        status = 'fail';
        error = err?.message || String(err);
      }
      try {
        screenshot = await capture(win, i + 1, status);
      } catch (captureError) {
        status = 'fail';
        const captureMessage = `Screenshot failed: ${captureError?.message || String(captureError)}`;
        error = error ? `${error} | ${captureMessage}` : captureMessage;
      }
      results.push({
        scenario: scenarios[i].name,
        expected: 'pass',
        actual: status,
        screenshot,
        error,
      });
    }

    await app.close();
    app = null;
  } finally {
    try {
      if (app) await app.close();
      if (bootstrapApp) await bootstrapApp.close();
    } catch {}

    if (userDataPath) {
      if (backupStore === null) {
        fs.rmSync(path.join(userDataPath, 'store.json'), { force: true });
      } else {
        fs.writeFileSync(path.join(userDataPath, 'store.json'), backupStore, 'utf8');
      }

      if (backupLog === null) {
        fs.rmSync(path.join(userDataPath, 'app.log'), { force: true });
      } else {
        fs.writeFileSync(path.join(userDataPath, 'app.log'), backupLog, 'utf8');
      }
    }

    await new Promise((resolve) => mock.server.close(resolve));
  }

  writeJson(REPORT_PATH, results);
  console.log('\nElectron E2E results:');
  for (const r of results) {
    const extra = r.error ? ` | error: ${r.error}` : '';
    console.log(`- ${r.scenario} | expected=${r.expected} actual=${r.actual} | ${r.screenshot}${extra}`);
  }
  console.log(`Report: ${REPORT_PATH}`);
  process.exitCode = results.every((x) => x.expected === x.actual) ? 0 : 1;
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
