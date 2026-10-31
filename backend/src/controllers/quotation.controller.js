import {
  changeQuotationStatus,
  convertQuotation,
  createQuotationRecord,
  deleteQuotation,
  getQuotation,
  getQuotationTemplates,
  listQuotationRecords,
  quotationPdf,
  sendQuotationEmail,
  updateQuotationRecord,
} from '../services/quotation.service.js';
import { requestIp } from '../services/audit.service.js';
import { validated } from '../middleware/validate.middleware.js';
import { sendCreated, sendSuccess } from '../utils/response.utils.js';

export async function index(request, response) {
  const result = await listQuotationRecords(validated(request, 'query'));
  return sendSuccess(response, result.rows, { meta: result.meta });
}

export async function templates(request, response) {
  const rows = await getQuotationTemplates();
  return sendSuccess(response, rows);
}

export async function show(request, response) {
  const quotation = await getQuotation(validated(request, 'params').id);
  return sendSuccess(response, quotation);
}

export async function store(request, response) {
  const quotation = await createQuotationRecord(validated(request), {
    actor: request.user,
    ipAddress: requestIp(request),
  });
  return sendCreated(response, quotation, { message: 'Quotation created.' });
}

export async function update(request, response) {
  const quotation = await updateQuotationRecord(
    validated(request, 'params').id,
    validated(request),
    { actor: request.user, ipAddress: requestIp(request) },
  );
  return sendSuccess(response, quotation, { message: 'Quotation updated.' });
}

export async function destroy(request, response) {
  const result = await deleteQuotation(validated(request, 'params').id, {
    actor: request.user,
    ipAddress: requestIp(request),
  });
  return sendSuccess(response, result);
}

export async function downloadPdf(request, response) {
  const { buffer, filename } = await quotationPdf(validated(request, 'params').id);
  response.setHeader('Content-Type', 'application/pdf');
  response.setHeader(
    'Content-Disposition',
    `attachment; filename="${filename}"`,
  );
  return response.status(200).send(buffer);
}

export async function send(request, response) {
  const quotation = await sendQuotationEmail(
    validated(request, 'params').id,
    validated(request),
    { actor: request.user, ipAddress: requestIp(request) },
  );
  return sendSuccess(response, quotation, {
    message: 'Quotation emailed successfully.',
  });
}

export async function updateStatus(request, response) {
  const quotation = await changeQuotationStatus(
    validated(request, 'params').id,
    validated(request).status,
    { actor: request.user, ipAddress: requestIp(request) },
  );
  return sendSuccess(response, quotation, { message: 'Quotation status updated.' });
}

export async function convert(request, response) {
  const result = await convertQuotation(
    validated(request, 'params').id,
    validated(request),
    { actor: request.user, ipAddress: requestIp(request) },
  );
  return sendCreated(response, result, {
    message: 'Quotation converted into a subscription.',
  });
}
