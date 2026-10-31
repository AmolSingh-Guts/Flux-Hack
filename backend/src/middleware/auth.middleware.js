import asyncHandler from '../utils/asyncHandler.js';
import { verifyAccessToken } from '../utils/token.utils.js';
import ApiError from '../utils/ApiError.js';
import { findUserById } from '../models/user.model.js';

const authenticate = asyncHandler(async (request, response, next) => {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    throw new ApiError(401, 'Authentication required.');
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    throw new ApiError(401, 'Authentication required.');
  }

  let payload;

  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new ApiError(401, 'Your session is invalid or has expired.');
  }

  const user = await findUserById(payload.sub);

  if (!user || !user.is_active) {
    throw new ApiError(401, 'Your account is inactive or unavailable.');
  }

  request.user = user;
  return next();
});

export default authenticate;
