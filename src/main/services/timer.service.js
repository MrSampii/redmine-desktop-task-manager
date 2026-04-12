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

function hydrateTimer(activeTimer) {
  if (!activeTimer) {
    return null;
  }

  return {
    ...activeTimer,
    elapsedSeconds: getElapsedSeconds(activeTimer),
  };
}

function createTimer(timerInput) {
  return {
    issueId: Number(timerInput.issueId),
    issueSubject: String(timerInput.issueSubject || ''),
    projectName: String(timerInput.projectName || ''),
    startedAt: new Date().toISOString(),
    comment: String(timerInput.comment || '').trim(),
  };
}

module.exports = {
  createTimer,
  getElapsedSeconds,
  hydrateTimer,
};
