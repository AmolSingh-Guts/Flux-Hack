import {
  createDiscountRecord,
  getDiscount,
  listDiscountRecords,
  removeDiscount,
  updateDiscountRecord,
} from '../services/discount.service.js';
import { requestIp } from '../services/audit.service.js';
import { validated } from '../middleware/validate.middleware.js';
import { sendCreated, sendSuccess } from '../utils/response.utils.js';

export async function index(request, response) {
  const result = await listDiscountRecords(validated(request, 'query'));
  return sendSuccess(response, result.rows, { meta: result.meta });
}

export async function show(request, response) {
  const discount = await getDiscount(validated(request, 'params').id);
  return sendSuccess(response, discount);
}

export async function store(request, response) {
  const discount = await createDiscountRecord(validated(request), {
    actor: request.user,
    ipAddress: requestIp(request),
  });
  return sendCreated(response, discount, { message: 'Discount created.' });
}

export async function update(request, response) {
  const discount = await updateDiscountRecord(
    validated(request, 'params').id,
    validated(request),
    { actor: request.user, ipAddress: requestIp(request) },
  );
  return sendSuccess(response, discount, { message: 'Discount updated.' });
}

export async function destroy(request, response) {
  const result = await removeDiscount(validated(request, 'params').id, {
    actor: request.user,
    ipAddress: requestIp(request),
  });
  return sendSuccess(response, result);
}
