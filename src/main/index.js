const { app, BrowserWindow, ipcMain } = require('electron');
const { registerIpcHandlers } = require('./ipc/register-ipc-handlers');
const { logError, logInfo } = require('./services/logger.service');
const { createMainWindow } = require('./windows/main-window');

function registerProcessErrorHandlers() {
  process.on('uncaughtException', (error) => {
    logError('process:uncaughtException', error);
  });

  process.on('unhandledRejection', (reason) => {
    logError('process:unhandledRejection', reason instanceof Error ? reason : new Error(String(reason)));
  });
}

function registerAppEventHandlers() {
  app.on('render-process-gone', (_, webContents, details) => {
    logError('app:render-process-gone', new Error(details?.reason || 'Renderer process gone'), {
      details,
      url: webContents?.getURL?.() || '',
    });
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });

  app.on('window-all-closed', () => {
    logInfo('app', 'All windows closed');
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

async function bootstrapApp() {
  logInfo('app', 'Application starting');
  registerProcessErrorHandlers();
  registerAppEventHandlers();
  registerIpcHandlers(ipcMain);
  createMainWindow();
}

app.whenReady().then(bootstrapApp);
