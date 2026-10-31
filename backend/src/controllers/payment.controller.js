import {
  createPaymentRecord,
  getPayment,
  listPaymentRecords,
  paymentReceipt,
  sendPaymentReceipt,
  voidPaymentRecord,
} from '../services/payment.service.js';
import { requestIp } from '../services/audit.service.js';
import { validated } from '../middleware/validate.middleware.js';
import { sendCreated, sendSuccess } from '../utils/response.utils.js';

export async function index(request, response) {
  const result = await listPaymentRecords(validated(request, 'query'));
  return sendSuccess(response, result.rows, { meta: result.meta });
}

export async function show(request, response) {
  const payment = await getPayment(validated(request, 'params').id);
  return sendSuccess(response, payment);
}

export async function store(request, response) {
  const payment = await createPaymentRecord(validated(request), {
    actor: request.user,
    ipAddress: requestIp(request),
  });
  return sendCreated(response, payment, { message: 'Payment recorded.' });
}

export async function voidPayment(request, response) {
  const payment = await voidPaymentRecord(validated(request, 'params').id, {
    actor: request.user,
    ipAddress: requestIp(request),
  });
  return sendSuccess(response, payment, { message: 'Payment voided.' });
}

export async function downloadReceipt(request, response) {
  const { buffer, filename } = await paymentReceipt(
    validated(request, 'params').id,
  );
  response.setHeader('Content-Type', 'application/pdf');
  response.setHeader(
    'Content-Disposition',
    `attachment; filename="${filename}"`,
  );
  return response.status(200).send(buffer);
}

export async function sendReceipt(request, response) {
  const payment = await sendPaymentReceipt(
    validated(request, 'params').id,
    validated(request),
    { actor: request.user, ipAddress: requestIp(request) },
  );
  return sendSuccess(response, payment, {
    message: 'Payment receipt emailed successfully.',
  });
}
