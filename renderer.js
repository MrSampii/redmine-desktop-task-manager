const state = {
  config: null,
  issues: [],
  selectedIssueId: null,
  activeTimer: null,
  timerInterval: null,
  currentView: 'tasks',
};

const els = {
  viewTasksBtn: document.getElementById('viewTasksBtn'),
  viewSettingsBtn: document.getElementById('viewSettingsBtn'),
  tasksView: document.getElementById('tasksView'),
  settingsView: document.getElementById('settingsView'),

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
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

function setStatus(el, text, type = '') {
  el.textContent = text || '';
  el.className = `status ${type}`.trim();
}

function applyTheme(themeMode) {
  const theme = ['dark', 'light', 'pink'].includes(themeMode) ? themeMode : 'dark';
  document.body.dataset.theme = theme;
}

function switchView(viewName) {
  const nextView = viewName === 'settings' ? 'settings' : 'tasks';
  state.currentView = nextView;

  const isTasks = nextView === 'tasks';
  els.tasksView.classList.toggle('active', isTasks);
  els.settingsView.classList.toggle('active', !isTasks);
  els.viewTasksBtn.classList.toggle('active', isTasks);
  els.viewSettingsBtn.classList.toggle('active', !isTasks);
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

function renderIssues() {
  els.issuesList.innerHTML = '';
  els.issuesCount.textContent = `${state.issues.length} loaded`;

  if (state.issues.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'card';
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
          <div class="issue-id">#${issue.id} ${issue.tracker}</div>
          <div>${issue.subject}</div>
        </div>
        <span class="badge">${issue.status}</span>
      </div>
      <div class="meta">${issue.project} | Spent ${issue.spentHours}h | Est. ${issue.estimatedHours || '-'}h</div>
      <div class="row">
        <button data-action="start" data-id="${issue.id}">Start timer</button>
        <button class="secondary" data-action="select" data-id="${issue.id}">Select</button>
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

  els.timerIssue.innerHTML = `<span class="timer-running">Running</span> #${active.issueId} ${active.issueSubject}`;
  els.timerElapsed.textContent = formatDuration(active.elapsedSeconds || 0);
  els.stopAndLogBtn.disabled = false;
  els.discardTimerBtn.disabled = false;
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
  const config = await window.redmineApi.getConfig();
  state.config = config;
  fillConfig(config);
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
  state.activeTimer = await window.redmineApi.getTimer();
  renderTimer();
  startTicker();
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

  const timer = await window.redmineApi.startTimer({
    issueId: issue.id,
    issueSubject: issue.subject,
    projectName: issue.project,
    comment: issue.subject,
  });

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
}

async function handleDiscardTimer() {
  await window.redmineApi.discardTimer();
  state.activeTimer = null;
  renderTimer();
  setStatus(els.timerStatus, 'Timer discarded without logging.', 'ok');
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
      <td>${entry.spentOn}</td>
      <td>${entry.hours}</td>
      <td>${entry.activity}</td>
      <td>${entry.comments || ''}</td>
      <td>${entry.user}</td>
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
      setStatus(els.configStatus, error.message || 'Failed to save settings.', 'error');
    }
  });

  els.refreshBtn.addEventListener('click', loadIssues);
  els.themeMode.addEventListener('change', () => applyTheme(els.themeMode.value));
  els.viewTasksBtn.addEventListener('click', () => switchView('tasks'));
  els.viewSettingsBtn.addEventListener('click', () => switchView('settings'));

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

    if (button.dataset.action === 'select') {
      setSelectedIssue(issueId);
      setStatus(els.manualStatus, `Issue #${issueId} selected.`, 'ok');
    }
  });

  els.stopAndLogBtn.addEventListener('click', handleStopAndLog);
  els.discardTimerBtn.addEventListener('click', handleDiscardTimer);
  els.logManualBtn.addEventListener('click', logManualTime);
  els.loadEntriesBtn.addEventListener('click', loadEntries);
}

async function init() {
  els.manualSpentOn.value = today();
  els.timerSpentOn.value = today();

  bindEvents();
  await loadConfig();
  await restoreTimer();

  if (state.config.baseUrl && state.config.apiKey) {
    await loadIssues();
    switchView('tasks');
  } else {
    setStatus(els.globalStatus, 'Configure Redmine URL and API key to start.', 'error');
    switchView('settings');
  }
}

window.addEventListener('beforeunload', stopTicker);
window.addEventListener('DOMContentLoaded', init);
