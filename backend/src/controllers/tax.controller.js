import {
  createTax,
  getActiveTaxes,
  getTax,
  listTaxes,
  removeTax,
  updateTax,
} from '../services/tax.service.js';
import { requestIp } from '../services/audit.service.js';
import { validated } from '../middleware/validate.middleware.js';
import { sendCreated, sendSuccess } from '../utils/response.utils.js';

export async function index(request, response) {
  const result = await listTaxes(validated(request, 'query'));
  return sendSuccess(response, result.rows, { meta: result.meta });
}

export async function active(request, response) {
  const taxes = await getActiveTaxes();
  return sendSuccess(response, taxes);
}

export async function show(request, response) {
  const tax = await getTax(validated(request, 'params').id);
  return sendSuccess(response, tax);
}

export async function store(request, response) {
  const tax = await createTax(validated(request), {
    actor: request.user,
    ipAddress: requestIp(request),
  });
  return sendCreated(response, tax, { message: 'Tax rule created.' });
}

export async function update(request, response) {
  const tax = await updateTax(
    validated(request, 'params').id,
    validated(request),
    { actor: request.user, ipAddress: requestIp(request) },
  );
  return sendSuccess(response, tax, { message: 'Tax rule updated.' });
}

export async function destroy(request, response) {
  const result = await removeTax(validated(request, 'params').id, {
    actor: request.user,
    ipAddress: requestIp(request),
  });
  return sendSuccess(response, result);
}
