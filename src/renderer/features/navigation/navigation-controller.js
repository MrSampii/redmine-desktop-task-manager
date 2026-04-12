window.RedmineApp = window.RedmineApp || {};
window.RedmineApp.features = window.RedmineApp.features || {};

window.RedmineApp.features.createNavigationController = function createNavigationController(state, els, logsController) {
  const { APP_VIEWS } = window.RedmineApp.constants;
  const viewMap = {
    [APP_VIEWS.TASKS]: els.tasksView,
    [APP_VIEWS.DETAIL]: els.detailView,
    [APP_VIEWS.LOGS]: els.logsView,
    [APP_VIEWS.SETTINGS]: els.settingsView,
  };

  const buttonMap = {
    [APP_VIEWS.TASKS]: els.viewTasksBtn,
    [APP_VIEWS.DETAIL]: els.viewDetailBtn,
    [APP_VIEWS.LOGS]: els.viewLogsBtn,
    [APP_VIEWS.SETTINGS]: els.viewSettingsBtn,
  };

  function setMenuOpen(isOpen) {
    els.menuPanel.classList.toggle('open', isOpen);
    els.menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }

  async function switchView(viewName) {
    const nextView = Object.values(APP_VIEWS).includes(viewName) ? viewName : APP_VIEWS.TASKS;
    state.currentView = nextView;

    for (const [view, element] of Object.entries(viewMap)) {
      element.classList.toggle('active', view === nextView);
    }

    for (const [view, button] of Object.entries(buttonMap)) {
      button.classList.toggle('active', view === nextView);
    }

    if (nextView === APP_VIEWS.LOGS && !state.logsLoaded) {
      await logsController.loadLogs();
    }

    setMenuOpen(false);
  }

  return {
    setMenuOpen,
    switchView,
  };
};
