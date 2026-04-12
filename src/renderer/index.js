const { createApp, utils } = window.RedmineApp;
let app = null;

window.addEventListener('error', (event) => {
  if (!app) {
    console.error('[window:error]', event.message || 'Unhandled window error');
    return;
  }

  app.logClient('error', 'window:error', event.message || 'Unhandled window error', {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  if (!app) {
    console.error('[window:unhandledrejection]', utils.normalizeRendererError(event.reason));
    return;
  }

  app.logClient('error', 'window:unhandledrejection', utils.normalizeRendererError(event.reason));
});

window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    try {
      if (!window.redmineApi) {
        throw new Error('redmineApi is not available in the renderer context.');
      }

      app = createApp();
      window.addEventListener('beforeunload', app.stopTicker);
      app.init().catch((error) => {
        app.logClient('error', 'init', utils.normalizeRendererError(error));
      });
    } catch (error) {
      console.error('[init]', utils.normalizeRendererError(error));
    }
  }, 0);
});
