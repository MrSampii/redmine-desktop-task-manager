window.RedmineApp = window.RedmineApp || {};
window.RedmineApp.features = window.RedmineApp.features || {};

window.RedmineApp.features.createIssuesController = function createIssuesController(state, els, api) {
  const { escapeHtml, setStatus } = window.RedmineApp.utils;
  function findIssue(issueId) {
    return state.issues.find((issue) => issue.id === Number(issueId));
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
            <div class="issue-id">#${escapeHtml(issue.id)} ${escapeHtml(issue.tracker)}</div>
            <div>${escapeHtml(issue.subject)}</div>
          </div>
          <span class="badge">${escapeHtml(issue.status)}</span>
        </div>
        <div class="meta">${escapeHtml(issue.project)} | Spent ${escapeHtml(issue.spentHours)}h | Est. ${escapeHtml(issue.estimatedHours || '-')}h</div>
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

  async function loadIssues() {
    setStatus(els.globalStatus, 'Loading issues...');
    const result = await api.fetchIssues();
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

  return {
    findIssue,
    loadIssues,
    renderIssues,
  };
};
