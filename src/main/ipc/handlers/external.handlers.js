const { IPC_CHANNELS } = require('../../../shared/ipc/channels');
const { openExternalUrl } = require('../../security/external-links');

function registerExternalHandlers(ipcMain) {
  ipcMain.handle(IPC_CHANNELS.EXTERNAL_OPEN, (_, rawUrl) => openExternalUrl(rawUrl));
}

module.exports = {
  registerExternalHandlers,
};
