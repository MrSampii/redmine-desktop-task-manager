window.RedmineApp = window.RedmineApp || {};

window.RedmineApp.createApp = function createApp() {
  const { getElements } = window.RedmineApp.dom;
  const { createAppState } = window.RedmineApp.state;
  const { getRedmineApi } = window.RedmineApp.services;
  const {
    normalizeRendererError,
    today,
    createDescriptionHelpers,
    createRendererLogger,
    setStatus,
  } = window.RedmineApp.utils;
  const {
    createConfigController,
    createIssueDetailController,
    createIssuesController,
    createLogsController,
    createNavigationController,
    createTimeEntriesController,
    createTimerController,
  } = window.RedmineApp.features;
  const state = createAppState();
  const els = getElements();
  const api = getRedmineApi();
  const logClient = createRendererLogger(api);
  const descriptionHelpers = createDescriptionHelpers(state);

  const configController = createConfigController(state, els, api);
  const issuesController = createIssuesController(state, els, api);
  const logsController = createLogsController(state, els, api);
  const timeEntriesController = createTimeEntriesController(state, els, api);
  const timerController = createTimerController(state, els, api, issuesController.findIssue);
  const navigationController = createNavigationController(state, els, logsController);

  function setSelectedIssue(issueId) {
    state.selectedIssueId = Number(issueId);
    const issue = issuesController.findIssue(issueId);

    if (issue) {
      els.selectedIssueLabel.textContent = `Selected #${issue.id}: ${issue.subject}`;
      els.manualIssueId.value = String(issue.id);
    } else {
      els.selectedIssueLabel.textContent = `Selected issue #${issueId}`;
      els.manualIssueId.value = String(issueId);
    }

    els.viewDetailBtn.disabled = false;
  }

  const issueDetailController = createIssueDetailController(state, els, api, descriptionHelpers);

  async function openIssueDetail(issueId) {
    setSelectedIssue(issueId);
    await issueDetailController.openIssueDetail(
      issueId,
      () => timeEntriesController.loadEntries(),
      navigationController.switchView,
    );
  }

  async function reloadSelectedIssueIfNeeded() {
    if (state.selectedIssueId) {
      await openIssueDetail(state.selectedIssueId);
    }
  }

  function bindEvents() {
    els.configForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      try {
        const saved = await api.saveConfig({
          baseUrl: els.baseUrl.value,
          apiKey: els.apiKey.value,
          userId: els.userId.value,
          defaultActivityId: els.activityId.value,
          issueQuery: els.issueQuery.value,
          themeMode: els.themeMode.value,
        });

        state.config = saved;
        setStatus(els.configStatus, 'Settings saved.', 'ok');
        await issuesController.loadIssues();
        await navigationController.switchView('tasks');
      } catch (error) {
        logClient('error', 'saveConfig', normalizeRendererError(error));
        setStatus(els.configStatus, error.message || 'Failed to save settings.', 'error');
      }
    });

    els.refreshBtn.addEventListener('click', () => issuesController.loadIssues());
    els.themeMode.addEventListener('change', () => configController.applyTheme(els.themeMode.value));
    els.menuToggle.addEventListener('click', () => {
      const isOpen = els.menuPanel.classList.contains('open');
      navigationController.setMenuOpen(!isOpen);
    });

    els.viewTasksBtn.addEventListener('click', () => navigationController.switchView('tasks'));
    els.viewDetailBtn.addEventListener('click', () => {
      if (state.selectedIssueId) {
        navigationController.switchView('detail');
      }
    });
    els.viewLogsBtn.addEventListener('click', async () => {
      await navigationController.switchView('logs');
      await logsController.loadLogs();
    });
    els.viewSettingsBtn.addEventListener('click', () => navigationController.switchView('settings'));

    document.addEventListener('click', (event) => {
      if (!event.target.closest('#menuPanel, #menuToggle')) {
        navigationController.setMenuOpen(false);
      }
    });

    els.issuesList.addEventListener('click', async (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) {
        return;
      }

      const issueId = Number(button.dataset.id);
      try {
        if (button.dataset.action === 'start') {
          await timerController.handleStartTimer(issueId, setSelectedIssue);
          return;
        }

        if (button.dataset.action === 'detail') {
          await openIssueDetail(issueId);
        }
      } catch (error) {
        logClient('error', 'issuesList:click', normalizeRendererError(error), { issueId, action: button.dataset.action });
      }
    });

    els.detailAttachments.addEventListener('click', async (event) => {
      const button = event.target.closest('button[data-action="open-attachment"]');
      if (!button) {
        return;
      }

      const index = Number(button.dataset.index);
      const attachment = state.selectedIssueDetail?.attachments?.[index];
      if (!attachment) {
        setStatus(els.detailStatus, 'Attachment not found.', 'error');
        return;
      }

      try {
        await issueDetailController.openAttachmentUrl(attachment.contentUrl);
      } catch (error) {
        logClient('error', 'openAttachmentUrl', normalizeRendererError(error), { index });
        setStatus(els.detailStatus, 'Unexpected error opening attachment.', 'error');
      }
    });

    els.stopAndLogBtn.addEventListener('click', async () => {
      try {
        await timerController.handleStopAndLog(
          () => issuesController.loadIssues(),
          () => reloadSelectedIssueIfNeeded(),
        );
      } catch (error) {
        logClient('error', 'handleStopAndLog', normalizeRendererError(error));
        setStatus(els.timerStatus, 'Unexpected error logging timer.', 'error');
      }
    });

    els.discardTimerBtn.addEventListener('click', async () => {
      try {
        await timerController.handleDiscardTimer();
      } catch (error) {
        logClient('error', 'handleDiscardTimer', normalizeRendererError(error));
        setStatus(els.timerStatus, 'Unexpected error discarding timer.', 'error');
      }
    });

    els.logManualBtn.addEventListener('click', async () => {
      try {
        await timeEntriesController.logManualTime(
          () => issuesController.loadIssues(),
          (issueId) => openIssueDetail(issueId),
        );
      } catch (error) {
        logClient('error', 'logManualTime', normalizeRendererError(error));
        setStatus(els.manualStatus, 'Unexpected error logging time entry.', 'error');
      }
    });

    els.loadEntriesBtn.addEventListener('click', async () => {
      try {
        await timeEntriesController.loadEntries();
      } catch (error) {
        logClient('error', 'loadEntries', normalizeRendererError(error));
        setStatus(els.manualStatus, 'Unexpected error loading time entries.', 'error');
      }
    });

    els.logsRefreshBtn.addEventListener('click', () => logsController.loadLogs());
    els.logsClearBtn.addEventListener('click', () => logsController.clearLogs());
    els.logsExportBtn.addEventListener('click', () => logsController.exportLogs());

    const applyLogsFilters = () => logsController.loadLogs();
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

    bindEvents();
    issueDetailController.renderIssueDetail(null);
    await configController.loadConfig();
    await timerController.restoreTimer();

    if (state.config.baseUrl && state.config.apiKey) {
      await issuesController.loadIssues();
      await navigationController.switchView('tasks');
    } else {
      setStatus(els.globalStatus, 'Configure Redmine URL and API key to start.', 'error');
      await navigationController.switchView('settings');
    }
  }

  return {
    init,
    logClient,
    stopTicker: timerController.stopTicker,
  };
};
