window.RedmineApp = window.RedmineApp || {};
window.RedmineApp.state = window.RedmineApp.state || {};

window.RedmineApp.state.createAppState = function createAppState() {
  const { APP_VIEWS } = window.RedmineApp.constants;
  return {
    config: null,
    issues: [],
    selectedIssueId: null,
    selectedIssueDetail: null,
    activeTimer: null,
    timerInterval: null,
    currentView: APP_VIEWS.TASKS,
    logsLoaded: false,
    logsSearchDebounce: null,
  };
};
