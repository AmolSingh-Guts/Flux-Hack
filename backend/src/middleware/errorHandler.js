import env from '../config/env.js';

const mysqlErrors = {
  ER_DUP_ENTRY: {
    statusCode: 409,
    message: 'A record with the same unique value already exists.',
  },
  ER_NO_REFERENCED_ROW_2: {
    statusCode: 400,
    message: 'The referenced record does not exist.',
  },
  ER_ROW_IS_REFERENCED_2: {
    statusCode: 409,
    message: 'This record is still referenced by another record.',
  },
  ER_DATA_TOO_LONG: {
    statusCode: 400,
    message: 'One or more values are too long.',
  },
  ECONNREFUSED: {
    statusCode: 503,
    message: 'The database service is unavailable.',
  },
  PROTOCOL_CONNECTION_LOST: {
    statusCode: 503,
    message: 'The database connection was lost.',
  },
  ETIMEDOUT: {
    statusCode: 503,
    message: 'The database request timed out.',
  },
  ER_LOCK_DEADLOCK: {
    statusCode: 409,
    message: 'The request conflicted with another operation. Please retry.',
  },
};

// eslint-disable-next-line no-unused-vars -- Express identifies error middleware by its four arguments.
const errorHandler = (error, request, response, next) => {
  if (response.headersSent) {
    return next(error);
  }

  const knownDatabaseError = mysqlErrors[error.code];
  const isJsonParseError = error.type === 'entity.parse.failed';
  const statusCode = isJsonParseError
    ? 400
    : knownDatabaseError?.statusCode ??
      error.statusCode ??
      error.status ??
      500;
  const isServerError = statusCode >= 500;

  let message =
    knownDatabaseError?.message ??
    error.message ??
    'An unexpected error occurred.';

  if (isJsonParseError) {
    message = 'Request body contains invalid JSON.';
  }

  if (isServerError && env.isProduction) {
    message = 'An unexpected error occurred.';
  }

  if (isServerError) {
    console.error('[api:error]', error);
  }

  const payload = {
    success: false,
    message,
  };

  if (error.details !== undefined) {
    payload.details = error.details;
  }

  if (!env.isProduction && error.stack) {
    payload.stack = error.stack;
  }

  return response.status(statusCode).json(payload);
};

export default errorHandler;
