const { registerConfigHandlers } = require('./handlers/config.handlers');
const { registerExternalHandlers } = require('./handlers/external.handlers');
const { registerIssuesHandlers } = require('./handlers/issues.handlers');
const { registerLogsHandlers } = require('./handlers/logs.handlers');
const { registerTimerHandlers } = require('./handlers/timer.handlers');

function registerIpcHandlers(ipcMain) {
  registerLogsHandlers(ipcMain);
  registerConfigHandlers(ipcMain);
  registerExternalHandlers(ipcMain);
  registerIssuesHandlers(ipcMain);
  registerTimerHandlers(ipcMain);
}

module.exports = {
  registerIpcHandlers,
};
