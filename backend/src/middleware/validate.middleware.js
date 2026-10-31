import ApiError from '../utils/ApiError.js';

export function validate(schema, source = 'body') {
  return (request, response, next) => {
    const result = schema.safeParse(request[source] ?? {});

    if (!result.success) {
      return next(
        new ApiError(
          422,
          'Validation failed.',
          result.error.issues.map((issue) => ({
            field: issue.path.join('.') || source,
            message: issue.message,
          })),
        ),
      );
    }

    request.validated = request.validated ?? {};
    request.validated[source] = result.data;

    if (source === 'body') {
      request.body = result.data;
    }

    return next();
  };
}

export function validated(request, source = 'body') {
  return request.validated?.[source] ?? request[source];
}
