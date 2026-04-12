window.RedmineApp = window.RedmineApp || {};
window.RedmineApp.utils = window.RedmineApp.utils || {};

window.RedmineApp.utils.createRendererLogger = function createRendererLogger(api) {
  const { normalizeRendererError } = window.RedmineApp.utils;
  return function logClient(level, source, message, details = null) {
    try {
      const method = level === 'error' ? 'error' : 'log';
      console[method](`[${source}] ${message}`, details || '');
      api.logClientEvent({ level, source, message, details });
    } catch (error) {
      console.error('Failed to log client event', normalizeRendererError(error));
    }
  };
};
