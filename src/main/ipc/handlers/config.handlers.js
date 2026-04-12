const { IPC_CHANNELS } = require('../../../shared/ipc/channels');
const { getConfig, saveConfig } = require('../../services/store.service');

function registerConfigHandlers(ipcMain) {
  ipcMain.handle(IPC_CHANNELS.CONFIG_GET, () => getConfig());
  ipcMain.handle(IPC_CHANNELS.CONFIG_SAVE, (_, inputConfig) => saveConfig(inputConfig));
}

module.exports = {
  registerConfigHandlers,
};
