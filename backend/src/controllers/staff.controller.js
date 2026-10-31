import {
  createStaff,
  getStaff,
  listStaffMembers,
  updateStaffMember,
} from '../services/staff.service.js';
import { requestIp } from '../services/audit.service.js';
import { validated } from '../middleware/validate.middleware.js';
import { sendCreated, sendSuccess } from '../utils/response.utils.js';

export async function index(request, response) {
  const result = await listStaffMembers(validated(request, 'query'));
  return sendSuccess(response, result.rows, { meta: result.meta });
}

export async function show(request, response) {
  const staff = await getStaff(validated(request, 'params').id);
  return sendSuccess(response, staff);
}

export async function store(request, response) {
  const staff = await createStaff(validated(request), {
    actor: request.user,
    ipAddress: requestIp(request),
  });
  return sendCreated(response, staff, { message: 'Staff account created.' });
}

export async function update(request, response) {
  const staff = await updateStaffMember(
    validated(request, 'params').id,
    validated(request),
    { actor: request.user, ipAddress: requestIp(request) },
  );
  return sendSuccess(response, staff, { message: 'Staff account updated.' });
}
