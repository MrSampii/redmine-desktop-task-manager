const APP_VIEWS = Object.freeze({
  TASKS: 'tasks',
  DETAIL: 'detail',
  LOGS: 'logs',
  SETTINGS: 'settings',
});

const THEME_MODES = Object.freeze(['dark', 'light', 'pink']);

const STORE_FILE = 'store.json';
const LOG_FILE = 'app.log';

module.exports = {
  APP_VIEWS,
  THEME_MODES,
  STORE_FILE,
  LOG_FILE,
};
