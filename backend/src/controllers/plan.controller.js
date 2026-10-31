import {
  createPlanRecord,
  getPlan,
  getPlanOptions,
  listPlanRecords,
  removePlan,
  setPlanStatus,
  updatePlanRecord,
} from '../services/plan.service.js';
import { requestIp } from '../services/audit.service.js';
import { validated } from '../middleware/validate.middleware.js';
import { sendCreated, sendSuccess } from '../utils/response.utils.js';

export async function index(request, response) {
  const result = await listPlanRecords(validated(request, 'query'));
  return sendSuccess(response, result.rows, { meta: result.meta });
}

export async function options(request, response) {
  const plans = await getPlanOptions(
    validated(request, 'query').search ?? '',
  );
  return sendSuccess(response, plans);
}

export async function show(request, response) {
  const plan = await getPlan(validated(request, 'params').id);
  return sendSuccess(response, plan);
}

export async function store(request, response) {
  const plan = await createPlanRecord(validated(request), {
    actor: request.user,
    ipAddress: requestIp(request),
  });
  return sendCreated(response, plan, { message: 'Plan created.' });
}

export async function update(request, response) {
  const plan = await updatePlanRecord(
    validated(request, 'params').id,
    validated(request),
    { actor: request.user, ipAddress: requestIp(request) },
  );
  return sendSuccess(response, plan, { message: 'Plan updated.' });
}

export async function updateStatus(request, response) {
  const plan = await setPlanStatus(
    validated(request, 'params').id,
    validated(request).status,
    { actor: request.user, ipAddress: requestIp(request) },
  );
  return sendSuccess(response, plan, { message: 'Plan status updated.' });
}

export async function destroy(request, response) {
  const result = await removePlan(validated(request, 'params').id, {
    actor: request.user,
    ipAddress: requestIp(request),
  });
  return sendSuccess(response, result);
}
