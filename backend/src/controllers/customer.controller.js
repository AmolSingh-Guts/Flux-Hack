import {
  createCustomerRecord,
  getCustomerDetails,
  getCustomerOptions,
  listCustomerRecords,
  removeCustomer,
  updateCustomerRecord,
} from '../services/customer.service.js';
import { requestIp } from '../services/audit.service.js';
import { validated } from '../middleware/validate.middleware.js';
import { sendCreated, sendSuccess } from '../utils/response.utils.js';

export async function index(request, response) {
  const result = await listCustomerRecords(validated(request, 'query'));
  return sendSuccess(response, result.rows, { meta: result.meta });
}

export async function options(request, response) {
  const customers = await getCustomerOptions(
    validated(request, 'query').search,
  );
  return sendSuccess(response, customers);
}

export async function show(request, response) {
  const result = await getCustomerDetails(validated(request, 'params').id);
  return sendSuccess(response, result);
}

export async function store(request, response) {
  const customer = await createCustomerRecord(validated(request), {
    actor: request.user,
    ipAddress: requestIp(request),
  });
  return sendCreated(response, customer, { message: 'Customer created.' });
}

export async function update(request, response) {
  const customer = await updateCustomerRecord(
    validated(request, 'params').id,
    validated(request),
    { actor: request.user, ipAddress: requestIp(request) },
  );
  return sendSuccess(response, customer, { message: 'Customer updated.' });
}

export async function destroy(request, response) {
  const result = await removeCustomer(validated(request, 'params').id, {
    actor: request.user,
    ipAddress: requestIp(request),
  });
  return sendSuccess(response, result);
}
