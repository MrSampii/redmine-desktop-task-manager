const { THEME_MODES } = require('./app');

const defaultStore = Object.freeze({
  config: {
    baseUrl: '',
    apiKey: '',
    userId: '',
    defaultActivityId: '',
    issueQuery: 'assigned_to_id=me&status_id=open&sort=updated_on:desc',
    themeMode: THEME_MODES[0],
  },
  activeTimer: null,
});

function createDefaultStore() {
  return structuredClone(defaultStore);
}

module.exports = {
  defaultStore,
  createDefaultStore,
};
