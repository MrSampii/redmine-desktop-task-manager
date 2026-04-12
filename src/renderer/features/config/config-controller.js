window.RedmineApp = window.RedmineApp || {};
window.RedmineApp.features = window.RedmineApp.features || {};

window.RedmineApp.features.createConfigController = function createConfigController(state, els, api) {
  const { THEME_MODES } = window.RedmineApp.constants;
  function applyTheme(themeMode) {
    document.body.dataset.theme = THEME_MODES.includes(themeMode) ? themeMode : THEME_MODES[0];
  }

  function fillConfig(config) {
    els.baseUrl.value = config.baseUrl || '';
    els.apiKey.value = config.apiKey || '';
    els.userId.value = config.userId || '';
    els.activityId.value = config.defaultActivityId || '';
    els.issueQuery.value = config.issueQuery || '';
    els.themeMode.value = config.themeMode || THEME_MODES[0];
    applyTheme(config.themeMode || THEME_MODES[0]);

    if (!els.timerActivityId.value) {
      els.timerActivityId.value = config.defaultActivityId || '';
    }

    if (!els.manualActivityId.value) {
      els.manualActivityId.value = config.defaultActivityId || '';
    }
  }

  async function loadConfig() {
    const config = await api.getConfig();
    state.config = config;
    fillConfig(config);
  }

  return {
    applyTheme,
    fillConfig,
    loadConfig,
  };
};
