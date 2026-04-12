const IPC_CHANNELS = Object.freeze({
  LOG_RENDERER: 'log:renderer',
  CONFIG_GET: 'config:get',
  CONFIG_SAVE: 'config:save',
  LOGS_LIST: 'logs:list',
  LOGS_EXPORT: 'logs:export',
  LOGS_CLEAR: 'logs:clear',
  EXTERNAL_OPEN: 'external:open',
  TIMER_GET: 'timer:get',
  TIMER_START: 'timer:start',
  TIMER_DISCARD: 'timer:discard',
  TIMER_STOP_AND_LOG: 'timer:stop-and-log',
  ISSUES_FETCH: 'issues:fetch',
  ISSUE_FETCH_DETAIL: 'issue:fetch-detail',
  TIME_ENTRIES_FETCH: 'time-entries:fetch',
  TIME_ENTRIES_CREATE: 'time-entries:create',
});

module.exports = {
  IPC_CHANNELS,
};
