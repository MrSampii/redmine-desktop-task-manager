window.RedmineApp = window.RedmineApp || {};
window.RedmineApp.utils = window.RedmineApp.utils || {};

window.RedmineApp.utils.escapeHtml = function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

window.RedmineApp.utils.today = function today() {
  return new Date().toISOString().slice(0, 10);
};

window.RedmineApp.utils.formatDuration = function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((value) => String(value).padStart(2, '0')).join(':');
};

window.RedmineApp.utils.formatTs = function formatTs(iso) {
  if (!iso) {
    return '-';
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
};

window.RedmineApp.utils.formatBytes = function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (!value) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let idx = 0;
  while (size >= 1024 && idx < units.length - 1) {
    size /= 1024;
    idx += 1;
  }

  return `${size.toFixed(size >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
};

window.RedmineApp.utils.normalizeRendererError = function normalizeRendererError(error) {
  if (!error) {
    return 'Unknown error';
  }

  if (typeof error === 'string') {
    return error;
  }

  return error.message || 'Unexpected error';
};
