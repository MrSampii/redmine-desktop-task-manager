const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('redmineApi', {
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveConfig: (config) => ipcRenderer.invoke('config:save', config),
  fetchIssues: () => ipcRenderer.invoke('issues:fetch'),
  fetchTimeEntries: (issueId) => ipcRenderer.invoke('time-entries:fetch', issueId),
  createTimeEntry: (payload) => ipcRenderer.invoke('time-entries:create', payload),
  getTimer: () => ipcRenderer.invoke('timer:get'),
  startTimer: (payload) => ipcRenderer.invoke('timer:start', payload),
  discardTimer: () => ipcRenderer.invoke('timer:discard'),
  stopAndLogTimer: (payload) => ipcRenderer.invoke('timer:stop-and-log', payload),
});
