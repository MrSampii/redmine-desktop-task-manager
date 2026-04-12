const { IPC_CHANNELS } = require('../../../shared/ipc/channels');
const {
  createTimeEntry,
  fetchIssueDetail,
  fetchIssues,
  fetchTimeEntries,
} = require('../../services/redmine.service');

function registerIssuesHandlers(ipcMain) {
  ipcMain.handle(IPC_CHANNELS.ISSUES_FETCH, () => fetchIssues());
  ipcMain.handle(IPC_CHANNELS.ISSUE_FETCH_DETAIL, (_, issueId) => fetchIssueDetail(issueId));
  ipcMain.handle(IPC_CHANNELS.TIME_ENTRIES_FETCH, (_, issueId) => fetchTimeEntries(issueId));
  ipcMain.handle(IPC_CHANNELS.TIME_ENTRIES_CREATE, (_, payload) => createTimeEntry(payload));
}

module.exports = {
  registerIssuesHandlers,
};
