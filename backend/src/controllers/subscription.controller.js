import {
  activateSubscription,
  closeSubscription,
  confirmSubscription,
  createSubscriptionRecord,
  getSubscription,
  listSubscriptionRecords,
  pauseSubscription,
  removeSubscription,
  renewSubscription,
  resumeSubscription,
  updateSubscriptionRecord,
} from '../services/subscription.service.js';
import { generateSubscriptionInvoice } from '../services/invoice.service.js';
import { requestIp } from '../services/audit.service.js';
import { validated } from '../middleware/validate.middleware.js';
import { sendCreated, sendSuccess } from '../utils/response.utils.js';

export async function index(request, response) {
  const result = await listSubscriptionRecords(validated(request, 'query'));
  return sendSuccess(response, result.rows, { meta: result.meta });
}

export async function show(request, response) {
  const subscription = await getSubscription(validated(request, 'params').id);
  return sendSuccess(response, subscription);
}

export async function store(request, response) {
  const subscription = await createSubscriptionRecord(validated(request), {
    actor: request.user,
    ipAddress: requestIp(request),
  });
  return sendCreated(response, subscription, {
    message: 'Subscription created.',
  });
}

export async function update(request, response) {
  const subscription = await updateSubscriptionRecord(
    validated(request, 'params').id,
    validated(request),
    { actor: request.user, ipAddress: requestIp(request) },
  );
  return sendSuccess(response, subscription, {
    message: 'Subscription updated.',
  });
}

export async function destroy(request, response) {
  const result = await removeSubscription(validated(request, 'params').id, {
    actor: request.user,
    ipAddress: requestIp(request),
  });
  return sendSuccess(response, result);
}

export async function confirm(request, response) {
  const subscription = await confirmSubscription(
    validated(request, 'params').id,
    { actor: request.user, ipAddress: requestIp(request) },
  );
  return sendSuccess(response, subscription, {
    message: 'Subscription confirmed.',
  });
}

export async function activate(request, response) {
  const subscription = await activateSubscription(
    validated(request, 'params').id,
    { actor: request.user, ipAddress: requestIp(request) },
  );
  return sendSuccess(response, subscription, {
    message: 'Subscription activated.',
  });
}

export async function pause(request, response) {
  const subscription = await pauseSubscription(
    validated(request, 'params').id,
    { actor: request.user, ipAddress: requestIp(request) },
  );
  return sendSuccess(response, subscription, {
    message: 'Subscription paused.',
  });
}

export async function resume(request, response) {
  const subscription = await resumeSubscription(
    validated(request, 'params').id,
    { actor: request.user, ipAddress: requestIp(request) },
  );
  return sendSuccess(response, subscription, {
    message: 'Subscription resumed.',
  });
}

export async function renew(request, response) {
  const subscription = await renewSubscription(
    validated(request, 'params').id,
    { actor: request.user, ipAddress: requestIp(request) },
  );
  return sendSuccess(response, subscription, {
    message: 'Subscription renewed.',
  });
}

export async function close(request, response) {
  const subscription = await closeSubscription(
    validated(request, 'params').id,
    validated(request),
    { actor: request.user, ipAddress: requestIp(request) },
  );
  return sendSuccess(response, subscription, {
    message: 'Subscription closed.',
  });
}

export async function generateInvoice(request, response) {
  const result = await generateSubscriptionInvoice(
    validated(request, 'params').id,
    validated(request),
    { actor: request.user, ipAddress: requestIp(request) },
  );
  return sendCreated(response, result, {
    message: `Invoice ${result.invoiceNumber} generated.`,
  });
}
