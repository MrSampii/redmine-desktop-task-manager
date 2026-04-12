const fs = require('fs');
const { createDefaultStore, defaultStore } = require('../../shared/constants/store');
const { THEME_MODES } = require('../../shared/constants/app');
const { parseIssueQuery, sanitizeBaseUrl } = require('../../shared/utils/redmine');
const { getStorePath } = require('../config/paths');
const { logError } = require('./logger.service');

function readStore() {
  const storePath = getStorePath();
  if (!fs.existsSync(storePath)) {
    return createDefaultStore();
  }

  try {
    const content = fs.readFileSync(storePath, 'utf8');
    const parsed = JSON.parse(content);
    return {
      ...defaultStore,
      ...parsed,
      config: {
        ...defaultStore.config,
        ...(parsed.config || {}),
      },
    };
  } catch (error) {
    logError('store:read', error);
    return createDefaultStore();
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(getStorePath(), JSON.stringify(store, null, 2), 'utf8');
  } catch (error) {
    logError('store:write', error);
    throw error;
  }
}

function getConfig() {
  return readStore().config;
}

function saveConfig(inputConfig) {
  const store = readStore();
  const nextConfig = {
    ...store.config,
    ...inputConfig,
    baseUrl: sanitizeBaseUrl(inputConfig.baseUrl ?? store.config.baseUrl),
    issueQuery: parseIssueQuery(inputConfig.issueQuery ?? store.config.issueQuery, defaultStore.config.issueQuery),
    themeMode: THEME_MODES.includes(inputConfig.themeMode)
      ? inputConfig.themeMode
      : (store.config.themeMode || defaultStore.config.themeMode),
  };

  store.config = nextConfig;
  writeStore(store);
  return nextConfig;
}

function getActiveTimer() {
  return readStore().activeTimer;
}

function saveActiveTimer(timer) {
  const store = readStore();
  store.activeTimer = timer;
  writeStore(store);
  return store.activeTimer;
}

module.exports = {
  getActiveTimer,
  getConfig,
  readStore,
  saveActiveTimer,
  saveConfig,
  writeStore,
};
