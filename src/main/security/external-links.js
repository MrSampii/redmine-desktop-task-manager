const { shell } = require('electron');
const { normalizeError } = require('../../shared/utils/errors');
const { logError } = require('../services/logger.service');

function isSafeExternalUrl(rawUrl) {
  return /^https?:\/\//i.test(String(rawUrl || '').trim());
}

async function openExternalUrl(rawUrl) {
  try {
    const url = String(rawUrl || '').trim();
    if (!isSafeExternalUrl(url)) {
      throw new Error('Only HTTP/HTTPS URLs are allowed.');
    }

    await shell.openExternal(url);
    return { ok: true };
  } catch (error) {
    logError('external:open', error, { url: rawUrl });
    return { ok: false, message: normalizeError(error) };
  }
}

function configureWindowSecurity(window) {
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) {
      shell.openExternal(url).catch((error) => logError('external:window-open', error, { url }));
    }

    return { action: 'deny' };
  });

  window.webContents.on('will-navigate', (event, url) => {
    if (url !== window.webContents.getURL()) {
      event.preventDefault();
      if (isSafeExternalUrl(url)) {
        shell.openExternal(url).catch((error) => logError('external:navigate', error, { url }));
      }
    }
  });
}

module.exports = {
  configureWindowSecurity,
  isSafeExternalUrl,
  openExternalUrl,
};
