window.RedmineApp = window.RedmineApp || {};
window.RedmineApp.services = window.RedmineApp.services || {};

window.RedmineApp.services.getRedmineApi = function getRedmineApi() {
  if (!window.redmineApi) {
    throw new Error('redmineApi is not available in the renderer context.');
  }

  return window.redmineApi;
};
