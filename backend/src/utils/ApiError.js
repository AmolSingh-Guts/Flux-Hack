/**
 * Error type for expected, operational failures (for example a 404 or a
 * validation error). Unexpected programming errors should be thrown normally
 * and are hidden from clients in production by the error handler.
 */
export default class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);

    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace?.(this, this.constructor);
  }
}
