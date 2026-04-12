const { IPC_CHANNELS } = require('../../../shared/ipc/channels');
const { clearLogs, exportLogs, listLogs, writeLog } = require('../../services/logger.service');

function registerLogsHandlers(ipcMain) {
  ipcMain.handle(IPC_CHANNELS.LOG_RENDERER, (_, entry) => {
    const level = entry?.level === 'error' ? 'error' : 'info';
    writeLog(level, `renderer:${entry?.source || 'ui'}`, entry?.message || '', entry?.details || null);
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.LOGS_LIST, (_, filters) => listLogs(filters));
  ipcMain.handle(IPC_CHANNELS.LOGS_EXPORT, (_, filters) => exportLogs(filters));
  ipcMain.handle(IPC_CHANNELS.LOGS_CLEAR, () => clearLogs());
}

module.exports = {
  registerLogsHandlers,
};
