const fs = require('fs');
const { getLogPath, getLogsExportPath } = require('../config/paths');
const { normalizeError, serializeError } = require('../../shared/utils/errors');

function readLogEntries() {
  const logPath = getLogPath();
  if (!fs.existsSync(logPath)) {
    return [];
  }

  const content = fs.readFileSync(logPath, 'utf8');
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function filterLogEntries(entries, filters = {}) {
  const level = String(filters.level || '').trim().toLowerCase();
  const source = String(filters.source || '').trim().toLowerCase();
  const errorType = String(filters.errorType || '').trim().toLowerCase();
  const query = String(filters.query || '').trim().toLowerCase();
  const dateFrom = String(filters.dateFrom || '').trim();
  const dateTo = String(filters.dateTo || '').trim();

  return entries.filter((entry) => {
    const entryLevel = String(entry.level || '').toLowerCase();
    const entrySource = String(entry.source || '').toLowerCase();
    const entryErrorType = String(entry?.details?.error?.name || '').toLowerCase();
    const entryDate = String(entry.ts || '').slice(0, 10);

    if (level && entryLevel !== level) {
      return false;
    }

    if (source && entrySource !== source) {
      return false;
    }

    if (errorType && entryErrorType !== errorType) {
      return false;
    }

    if (dateFrom && (!entryDate || entryDate < dateFrom)) {
      return false;
    }

    if (dateTo && (!entryDate || entryDate > dateTo)) {
      return false;
    }

    if (query) {
      const haystack = `${entry.message || ''} ${entry.source || ''} ${JSON.stringify(entry.details || {})}`.toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }

    return true;
  });
}

function writeLog(level, source, message, details) {
  try {
    const payload = {
      ts: new Date().toISOString(),
      level,
      source,
      message,
      details: details || null,
    };
    fs.appendFileSync(getLogPath(), `${JSON.stringify(payload)}\n`, 'utf8');
  } catch (error) {
    console.error('Failed to write app log:', error);
  }
}

function logInfo(source, message, details) {
  writeLog('info', source, message, details);
}

function logError(source, error, details) {
  writeLog('error', source, normalizeError(error), {
    error: serializeError(error),
    ...(details || {}),
  });
}

function listLogs(filters) {
  try {
    const entries = readLogEntries().reverse();
    const filtered = filterLogEntries(entries, filters).slice(0, 1000);
    const sources = [...new Set(entries.map((entry) => entry.source).filter(Boolean))].sort();
    const errorTypes = [...new Set(entries.map((entry) => entry?.details?.error?.name).filter(Boolean))].sort();

    return {
      ok: true,
      logs: filtered,
      sources,
      errorTypes,
      filePath: getLogPath(),
    };
  } catch (error) {
    logError('logs:list', error);
    return { ok: false, message: normalizeError(error), logs: [], sources: [], errorTypes: [] };
  }
}

function exportLogs(filters) {
  try {
    const entries = readLogEntries().reverse();
    const filtered = filterLogEntries(entries, filters);
    const exportPath = getLogsExportPath();
    fs.writeFileSync(exportPath, JSON.stringify(filtered, null, 2), 'utf8');
    logInfo('logs:export', 'Logs exported', { exportPath, count: filtered.length });
    return { ok: true, path: exportPath, count: filtered.length };
  } catch (error) {
    logError('logs:export', error);
    return { ok: false, message: normalizeError(error) };
  }
}

function clearLogs() {
  try {
    fs.writeFileSync(getLogPath(), '', 'utf8');
    return { ok: true };
  } catch (error) {
    logError('logs:clear', error);
    return { ok: false, message: normalizeError(error) };
  }
}

module.exports = {
  clearLogs,
  exportLogs,
  filterLogEntries,
  listLogs,
  logError,
  logInfo,
  readLogEntries,
  writeLog,
};
