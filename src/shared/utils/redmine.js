function sanitizeBaseUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

function parseIssueQuery(rawQuery, fallbackQuery) {
  const query = String(rawQuery || '').trim();
  if (!query) {
    return fallbackQuery;
  }

  return query.replace(/^\?/, '');
}

module.exports = {
  sanitizeBaseUrl,
  parseIssueQuery,
};
