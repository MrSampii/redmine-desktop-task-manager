const { BrowserWindow } = require('electron');
const { getPreloadPath, getRendererHtmlPath } = require('../config/paths');
const { configureWindowSecurity } = require('../security/external-links');

function createMainWindow() {
  const window = new BrowserWindow({
    width: 1920,
    height: 1080,
    minWidth: 1000,
    minHeight: 720,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  configureWindowSecurity(window);
  window.loadFile(getRendererHtmlPath());
  return window;
}

module.exports = {
  createMainWindow,
};
