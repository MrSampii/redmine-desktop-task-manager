function normalizeError(error) {
  if (!error) {
    return 'Unknown error';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error.message) {
    return error.message;
  }

  return 'Unexpected error';
}

function serializeError(error) {
  if (!error) {
    return { message: 'Unknown error' };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  return {
    message: error.message || 'Unexpected error',
    stack: error.stack || '',
    name: error.name || 'Error',
  };
}

module.exports = {
  normalizeError,
  serializeError,
};
