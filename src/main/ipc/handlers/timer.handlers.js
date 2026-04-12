const { IPC_CHANNELS } = require('../../../shared/ipc/channels');
const { stopAndLogTimer } = require('../../services/redmine.service');
const { getActiveTimer, saveActiveTimer } = require('../../services/store.service');
const { createTimer, hydrateTimer } = require('../../services/timer.service');

function registerTimerHandlers(ipcMain) {
  ipcMain.handle(IPC_CHANNELS.TIMER_GET, () => hydrateTimer(getActiveTimer()));

  ipcMain.handle(IPC_CHANNELS.TIMER_START, (_, timerInput) => {
    const timer = createTimer(timerInput);
    saveActiveTimer(timer);
    return hydrateTimer(timer);
  });

  ipcMain.handle(IPC_CHANNELS.TIMER_DISCARD, () => {
    saveActiveTimer(null);
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.TIMER_STOP_AND_LOG, async (_, payload) => {
    const activeTimer = getActiveTimer();
    const result = await stopAndLogTimer(activeTimer, payload);
    if (result.ok) {
      saveActiveTimer(null);
    }

    return result;
  });
}

module.exports = {
  registerTimerHandlers,
};
