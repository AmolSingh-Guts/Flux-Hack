import { adminDashboard, customerDashboard, staffDashboard } from '../services/dashboard.service.js';
import { validated } from '../middleware/validate.middleware.js';
import { sendSuccess } from '../utils/response.utils.js';

export async function admin(request, response) {
  const result = await adminDashboard(validated(request, 'query'));
  return sendSuccess(response, result);
}

export async function staff(request, response) {
  const result = await staffDashboard(request.user, validated(request, 'query'));
  return sendSuccess(response, result);
}

export async function customer(request, response) {
  const result = await customerDashboard(request.user.customer_id);
  return sendSuccess(response, result);
}
