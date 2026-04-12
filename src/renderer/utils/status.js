window.RedmineApp = window.RedmineApp || {};
window.RedmineApp.utils = window.RedmineApp.utils || {};

window.RedmineApp.utils.setStatus = function setStatus(element, text, type = '') {
  element.textContent = text || '';
  element.className = `status ${type}`.trim();
};
