/**
 * Forwards rejected promises to Express's error-handling middleware.
 * Express 5 handles this natively, but keeping the helper makes route code
 * explicit and keeps the pattern stable if the framework changes.
 */
const asyncHandler = (handler) => (request, response, next) => {
  Promise.resolve(handler(request, response, next)).catch(next);
};

export default asyncHandler;
