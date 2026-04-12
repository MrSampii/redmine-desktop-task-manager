window.RedmineApp = window.RedmineApp || {};
window.RedmineApp.features = window.RedmineApp.features || {};

window.RedmineApp.features.createTimerController = function createTimerController(state, els, api, findIssue) {
  const { formatDuration, today, setStatus } = window.RedmineApp.utils;
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

  function stopTicker() {
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
  }

  function startTicker() {
    stopTicker();
    state.timerInterval = setInterval(async () => {
      state.activeTimer = await api.getTimer();
      renderTimer();
    }, 1000);
  }

  async function restoreTimer() {
    state.activeTimer = await api.getTimer();
    renderTimer();
    startTicker();
  }

  async function handleStartTimer(issueId, setSelectedIssue) {
    const issue = findIssue(issueId);
    if (!issue) {
      setStatus(els.timerStatus, 'Issue not found in loaded list.', 'error');
      return;
    }

    if (state.activeTimer) {
      setStatus(els.timerStatus, 'A timer is already running. Stop or discard it first.', 'error');
      return;
    }

    const timer = await api.startTimer({
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

  async function handleStopAndLog(onRefreshIssues, onReloadSelectedIssue) {
    if (!state.activeTimer) {
      return;
    }

    setStatus(els.timerStatus, 'Logging tracked time...');
    const result = await api.stopAndLogTimer({
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
    await onRefreshIssues();
    await onReloadSelectedIssue();
  }

  async function handleDiscardTimer() {
    await api.discardTimer();
    state.activeTimer = null;
    renderTimer();
    setStatus(els.timerStatus, 'Timer discarded without logging.', 'ok');
  }

  return {
    handleDiscardTimer,
    handleStartTimer,
    handleStopAndLog,
    renderTimer,
    restoreTimer,
    stopTicker,
  };
};
