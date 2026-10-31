import ApiError from '../utils/ApiError.js';

export function authorize(...roles) {
  return (request, response, next) => {
    if (!request.user) {
      return next(new ApiError(401, 'Authentication required.'));
    }

    if (!roles.includes(request.user.role)) {
      return next(
        new ApiError(403, 'You do not have permission to perform this action.'),
      );
    }

    return next();
  };
}

export function requirePermission(permission) {
  return (request, response, next) => {
    if (!request.user) {
      return next(new ApiError(401, 'Authentication required.'));
    }

    if (request.user.role === 'ADMIN') {
      return next();
    }

    if (
      request.user.role === 'STAFF' &&
      request.user.permissions.includes(permission)
    ) {
      return next();
    }

    return next(
      new ApiError(403, 'You do not have permission to perform this action.'),
    );
  };
}

export function requireCustomer(request, response, next) {
  if (!request.user?.customer_id) {
    return next(new ApiError(403, 'A linked customer account is required.'));
  }

  return next();
}
