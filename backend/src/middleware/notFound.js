import ApiError from '../utils/ApiError.js';

const notFound = (request, response, next) => {
  next(
    new ApiError(
      404,
      `Route ${request.method} ${request.originalUrl} was not found.`,
    ),
  );
};

export default notFound;
