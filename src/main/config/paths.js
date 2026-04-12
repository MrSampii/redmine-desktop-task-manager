const path = require('path');
const { app } = require('electron');
const { STORE_FILE, LOG_FILE } = require('../../shared/constants/app');

function getUserDataPath() {
  return app.getPath('userData');
}

function getStorePath() {
  return path.join(getUserDataPath(), STORE_FILE);
}

function getLogPath() {
  return path.join(getUserDataPath(), LOG_FILE);
}

function getLogsExportPath() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(app.getPath('downloads'), `redmine-app-logs-${stamp}.json`);
}

function getRendererHtmlPath() {
  return path.join(__dirname, '..', '..', 'renderer', 'index.html');
}

function getPreloadPath() {
  return path.join(__dirname, '..', '..', 'preload', 'index.js');
}

module.exports = {
  getStorePath,
  getLogPath,
  getLogsExportPath,
  getRendererHtmlPath,
  getPreloadPath,
};
