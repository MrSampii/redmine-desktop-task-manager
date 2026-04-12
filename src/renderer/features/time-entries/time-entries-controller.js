window.RedmineApp = window.RedmineApp || {};
window.RedmineApp.features = window.RedmineApp.features || {};

window.RedmineApp.features.createTimeEntriesController = function createTimeEntriesController(state, els, api) {
  const { escapeHtml, today, setStatus } = window.RedmineApp.utils;
  async function loadEntries() {
    const issueId = Number(els.manualIssueId.value || state.selectedIssueId);
    if (!issueId) {
      setStatus(els.manualStatus, 'Choose or type an issue id first.', 'error');
      return;
    }

    setStatus(els.manualStatus, 'Loading time entries...');
    const result = await api.fetchTimeEntries(issueId);
    if (!result.ok) {
      setStatus(els.manualStatus, result.message, 'error');
      return;
    }

    els.entriesBody.innerHTML = '';
    for (const entry of result.entries) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${escapeHtml(entry.spentOn)}</td>
        <td>${escapeHtml(entry.hours)}</td>
        <td>${escapeHtml(entry.activity)}</td>
        <td>${escapeHtml(entry.comments || '')}</td>
        <td>${escapeHtml(entry.user)}</td>
      `;
      els.entriesBody.appendChild(row);
    }

    setStatus(els.manualStatus, `Loaded ${result.entries.length} entries.`, 'ok');
  }

  async function logManualTime(onRefreshIssues, onOpenIssueDetail) {
    const payload = {
      issueId: Number(els.manualIssueId.value),
      hours: Number(els.manualHours.value),
      spentOn: els.manualSpentOn.value || today(),
      comments: els.manualComment.value,
      activityId: els.manualActivityId.value,
    };

    setStatus(els.manualStatus, 'Logging time entry...');
    const result = await api.createTimeEntry(payload);
    if (!result.ok) {
      setStatus(els.manualStatus, result.message, 'error');
      return;
    }

    setStatus(els.manualStatus, 'Time entry logged successfully.', 'ok');
    els.manualHours.value = '';
    await onRefreshIssues();
    await loadEntries();

    if (payload.issueId) {
      await onOpenIssueDetail(payload.issueId);
    }
  }

  return {
    loadEntries,
    logManualTime,
  };
};
