import {
  changePassword,
  forgotPassword,
  getCurrentUser,
  login,
  logout,
  registerCustomer,
  resetPassword,
  updateOwnProfile,
} from '../services/auth.service.js';
import { requestIp } from '../services/audit.service.js';
import { sendCreated, sendSuccess } from '../utils/response.utils.js';
import { validated } from '../middleware/validate.middleware.js';

export async function register(request, response) {
  const result = await registerCustomer(validated(request), {
    ipAddress: requestIp(request),
  });
  return sendCreated(response, result, {
    message: 'Account created successfully.',
  });
}

export async function loginUser(request, response) {
  const result = await login(validated(request), {
    ipAddress: requestIp(request),
  });
  return sendSuccess(response, result, { message: 'Signed in successfully.' });
}

export async function logoutUser(request, response) {
  const result = await logout(request.user, {
    ipAddress: requestIp(request),
  });
  return sendSuccess(response, result);
}

export async function currentUser(request, response) {
  const user = await getCurrentUser(request.user.id);
  return sendSuccess(response, user);
}

export async function requestPasswordReset(request, response) {
  const result = await forgotPassword(validated(request), {
    ipAddress: requestIp(request),
  });
  return sendSuccess(response, result);
}

export async function completePasswordReset(request, response) {
  const result = await resetPassword(validated(request), {
    ipAddress: requestIp(request),
  });
  return sendSuccess(response, result);
}

export async function updatePassword(request, response) {
  const result = await changePassword(
    request.user.id,
    validated(request),
    { ipAddress: requestIp(request) },
  );
  return sendSuccess(response, result);
}

export async function updateProfile(request, response) {
  const result = await updateOwnProfile(
    request.user.id,
    validated(request),
    { ipAddress: requestIp(request) },
  );
  return sendSuccess(response, result, { message: 'Profile updated.' });
}
