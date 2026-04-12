window.RedmineApp = window.RedmineApp || {};
window.RedmineApp.features = window.RedmineApp.features || {};

window.RedmineApp.features.createIssueDetailController = function createIssueDetailController(state, els, api, descriptionHelpers) {
  const { escapeHtml, setStatus } = window.RedmineApp.utils;
  function renderIssueDetail(issue) {
    if (!issue) {
      els.detailTitle.textContent = 'No issue selected';
      els.selectedIssueLabel.textContent = 'Choose an issue from Tasks.';
      els.detailFacts.innerHTML = '';
      els.detailDescription.innerHTML = '<span class="meta">No description available.</span>';
      els.detailAttachments.textContent = 'No attachments.';
      els.detailExtra.textContent = 'No extra data available.';
      return;
    }

    els.detailTitle.textContent = `#${issue.id} ${issue.subject}`;
    els.selectedIssueLabel.textContent = `${issue.project} | ${issue.tracker} | ${issue.status}`;

    const facts = [
      ['Priority', issue.priority],
      ['Assigned To', issue.assignedTo],
      ['Author', issue.author],
      ['Done Ratio', `${issue.doneRatio}%`],
      ['Estimated Hours', issue.estimatedHours],
      ['Spent Hours', issue.spentHours],
      ['Total Spent Hours', issue.totalSpentHours],
      ['Start Date', issue.startDate],
      ['Due Date', issue.dueDate],
      ['Created On', issue.createdOn],
      ['Updated On', issue.updatedOn],
      ['Closed On', issue.closedOn],
    ];

    els.detailFacts.innerHTML = facts
      .map(([label, value]) => `<div class="fact-item"><span class="meta">${escapeHtml(label)}</span><strong>${escapeHtml(value || '-')}</strong></div>`)
      .join('');

    els.detailDescription.innerHTML = descriptionHelpers.sanitizeDescriptionHtml(issue.description, issue);
    els.detailAttachments.innerHTML = (issue.attachments || []).length
      ? issue.attachments.map((attachment, idx) => descriptionHelpers.renderAttachmentCard(attachment, idx)).join('')
      : 'No attachments.';

    const extraData = [
      `Watchers: ${(issue.watchers || []).join(', ') || 'None'}`,
      `Children: ${(issue.children || []).map((child) => `#${child.id} ${child.subject}`).join(' | ') || 'None'}`,
      `Relations: ${(issue.relations || []).map((rel) => `${rel.relationType} #${rel.issueToId}`).join(' | ') || 'None'}`,
      `Custom Fields: ${(issue.customFields || []).map((cf) => `${cf.name}: ${cf.value || '-'}`).join(' | ') || 'None'}`,
      `Journals: ${issue.journalsCount || 0}`,
    ];

    els.detailExtra.textContent = extraData.join('\n');
  }

  async function openAttachmentUrl(rawUrl) {
    const url = descriptionHelpers.buildAttachmentAccessUrl(rawUrl);
    if (!url) {
      setStatus(els.detailStatus, 'Attachment URL is missing.', 'error');
      return;
    }

    const result = await api.openExternal(url);
    if (!result?.ok) {
      setStatus(els.detailStatus, result?.message || 'Unable to open attachment.', 'error');
    }
  }

  async function openIssueDetail(issueId, onLoadedEntries, switchView) {
    setStatus(els.detailStatus, 'Loading issue detail...');
    const detailResult = await api.fetchIssueDetail(Number(issueId));

    if (!detailResult.ok) {
      state.selectedIssueDetail = null;
      renderIssueDetail(null);
      setStatus(els.detailStatus, detailResult.message, 'error');
      await switchView('detail');
      return;
    }

    state.selectedIssueDetail = detailResult.issue;
    renderIssueDetail(detailResult.issue);
    setStatus(els.detailStatus, 'Issue detail loaded.', 'ok');
    await onLoadedEntries();
    await switchView('detail');
  }

  return {
    openAttachmentUrl,
    openIssueDetail,
    renderIssueDetail,
  };
};
