const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('redmineApi', {
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveConfig: (config) => ipcRenderer.invoke('config:save', config),
  fetchIssues: () => ipcRenderer.invoke('issues:fetch'),
  fetchIssueDetail: (issueId) => ipcRenderer.invoke('issue:fetch-detail', issueId),
  fetchTimeEntries: (issueId) => ipcRenderer.invoke('time-entries:fetch', issueId),
  createTimeEntry: (payload) => ipcRenderer.invoke('time-entries:create', payload),
  getTimer: () => ipcRenderer.invoke('timer:get'),
  startTimer: (payload) => ipcRenderer.invoke('timer:start', payload),
  discardTimer: () => ipcRenderer.invoke('timer:discard'),
  stopAndLogTimer: (payload) => ipcRenderer.invoke('timer:stop-and-log', payload),
  logClientEvent: (entry) => ipcRenderer.invoke('log:renderer', entry),
  listLogs: (filters) => ipcRenderer.invoke('logs:list', filters),
  exportLogs: (filters) => ipcRenderer.invoke('logs:export', filters),
  clearLogs: () => ipcRenderer.invoke('logs:clear'),
  openExternal: (url) => ipcRenderer.invoke('external:open', url),
});
