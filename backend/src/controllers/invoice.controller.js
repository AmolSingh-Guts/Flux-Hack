import {
  cancelInvoice,
  confirmInvoice,
  createManualInvoice,
  deleteDraftInvoice,
  getInvoice,
  invoicePdf,
  listInvoiceRecords,
  sendInvoiceEmail,
  updateDraftInvoice,
} from '../services/invoice.service.js';
import { requestIp } from '../services/audit.service.js';
import { validated } from '../middleware/validate.middleware.js';
import { sendCreated, sendSuccess } from '../utils/response.utils.js';

export async function index(request, response) {
  const result = await listInvoiceRecords(validated(request, 'query'));
  return sendSuccess(response, result.rows, { meta: result.meta });
}

export async function show(request, response) {
  const invoice = await getInvoice(validated(request, 'params').id);
  return sendSuccess(response, invoice);
}

export async function store(request, response) {
  const invoice = await createManualInvoice(validated(request), {
    actor: request.user,
    ipAddress: requestIp(request),
  });
  return sendCreated(response, invoice, { message: 'Invoice created.' });
}

export async function update(request, response) {
  const invoice = await updateDraftInvoice(
    validated(request, 'params').id,
    validated(request),
    { actor: request.user, ipAddress: requestIp(request) },
  );
  return sendSuccess(response, invoice, { message: 'Invoice updated.' });
}

export async function destroy(request, response) {
  const result = await deleteDraftInvoice(validated(request, 'params').id, {
    actor: request.user,
    ipAddress: requestIp(request),
  });
  return sendSuccess(response, result);
}

export async function downloadPdf(request, response) {
  const { buffer, filename } = await invoicePdf(validated(request, 'params').id);
  response.setHeader('Content-Type', 'application/pdf');
  response.setHeader(
    'Content-Disposition',
    `attachment; filename="${filename}"`,
  );
  return response.status(200).send(buffer);
}

export async function send(request, response) {
  const invoice = await sendInvoiceEmail(
    validated(request, 'params').id,
    validated(request),
    { actor: request.user, ipAddress: requestIp(request) },
  );
  return sendSuccess(response, invoice, {
    message: 'Invoice emailed successfully.',
  });
}

export async function confirm(request, response) {
  const invoice = await confirmInvoice(validated(request, 'params').id, {
    actor: request.user,
    ipAddress: requestIp(request),
  });
  return sendSuccess(response, invoice, { message: 'Invoice confirmed.' });
}

export async function cancel(request, response) {
  const invoice = await cancelInvoice(validated(request, 'params').id, {
    actor: request.user,
    ipAddress: requestIp(request),
  });
  return sendSuccess(response, invoice, { message: 'Invoice cancelled.' });
}
