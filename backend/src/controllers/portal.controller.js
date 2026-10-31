import {
  getPortalProfile,
  portalCloseSubscription,
  portalInvoice,
  portalInvoicePdf,
  portalInvoices,
  portalPauseSubscription,
  portalPayment,
  portalPaymentReceipt,
  portalPayments,
  portalResumeSubscription,
  portalSubscription,
  portalSubscriptions,
  updatePortalProfile,
} from '../services/portal.service.js';
import { requestIp } from '../services/audit.service.js';
import { validated } from '../middleware/validate.middleware.js';
import { sendSuccess } from '../utils/response.utils.js';

export async function profile(request, response) {
  const result = await getPortalProfile(request.user);
  return sendSuccess(response, result);
}

export async function updateProfile(request, response) {
  const result = await updatePortalProfile(request.user, validated(request), {
    ipAddress: requestIp(request),
  });
  return sendSuccess(response, result, { message: 'Profile updated.' });
}

export async function subscriptions(request, response) {
  const rows = await portalSubscriptions(request.user);
  return sendSuccess(response, rows);
}

export async function subscription(request, response) {
  const result = await portalSubscription(
    request.user,
    validated(request, 'params').id,
  );
  return sendSuccess(response, result);
}

export async function pauseSubscription(request, response) {
  const result = await portalPauseSubscription(
    request.user,
    validated(request, 'params').id,
    { ipAddress: requestIp(request) },
  );
  return sendSuccess(response, result, { message: 'Subscription paused.' });
}

export async function resumeSubscription(request, response) {
  const result = await portalResumeSubscription(
    request.user,
    validated(request, 'params').id,
    { ipAddress: requestIp(request) },
  );
  return sendSuccess(response, result, { message: 'Subscription resumed.' });
}

export async function closeSubscription(request, response) {
  const result = await portalCloseSubscription(
    request.user,
    validated(request, 'params').id,
    validated(request),
    { ipAddress: requestIp(request) },
  );
  return sendSuccess(response, result, { message: 'Subscription closed.' });
}

export async function invoices(request, response) {
  const result = await portalInvoices(
    request.user,
    validated(request, 'query'),
  );
  return sendSuccess(response, result.rows, { meta: result.meta });
}

export async function invoice(request, response) {
  const result = await portalInvoice(
    request.user,
    validated(request, 'params').id,
  );
  return sendSuccess(response, result);
}

export async function invoicePdf(request, response) {
  const { buffer, filename } = await portalInvoicePdf(
    request.user,
    validated(request, 'params').id,
  );
  response.setHeader('Content-Type', 'application/pdf');
  response.setHeader(
    'Content-Disposition',
    `attachment; filename="${filename}"`,
  );
  return response.status(200).send(buffer);
}

export async function payments(request, response) {
  const result = await portalPayments(
    request.user,
    validated(request, 'query'),
  );
  return sendSuccess(response, result.rows, { meta: result.meta });
}

export async function payment(request, response) {
  const result = await portalPayment(
    request.user,
    validated(request, 'params').id,
  );
  return sendSuccess(response, result);
}

export async function paymentReceipt(request, response) {
  const { buffer, filename } = await portalPaymentReceipt(
    request.user,
    validated(request, 'params').id,
  );
  response.setHeader('Content-Type', 'application/pdf');
  response.setHeader(
    'Content-Disposition',
    `attachment; filename="${filename}"`,
  );
  return response.status(200).send(buffer);
}
