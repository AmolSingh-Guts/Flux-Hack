import { withTransaction } from '../config/database.js';
import {
  createUser,
  findUserByEmail,
  findUserById,
  listStaff,
  updateStaff,
} from '../models/user.model.js';
import ApiError from '../utils/ApiError.js';
import { hashPassword } from '../utils/password.utils.js';
import { parsePagination, paginationMeta } from '../utils/pagination.utils.js';
import { writeAuditLog } from './audit.service.js';

export async function listStaffMembers(query) {
  const pagination = parsePagination(query, {
    allowedSortFields: ['name', 'email', 'is_active', 'created_at', 'last_login_at'],
    defaultSortBy: 'created_at',
  });
  const result = await listStaff({ ...query, ...pagination });

  return {
    rows: result.rows,
    meta: paginationMeta({ ...pagination, total: result.total }),
  };
}

export async function getStaff(staffId) {
  const staff = await findUserById(staffId);

  if (!staff || staff.role !== 'STAFF') {
    throw new ApiError(404, 'Staff member not found.');
  }

  return staff;
}

export async function createStaff(payload, context = {}) {
  const existing = await findUserByEmail(payload.email);

  if (existing) {
    throw new ApiError(409, 'An account with this email already exists.');
  }

  const passwordHash = await hashPassword(payload.password);

  const staffId = await withTransaction(async (connection) => {
    const id = await createUser(connection, {
      name: payload.name,
      email: payload.email,
      passwordHash,
      role: 'STAFF',
      permissions: payload.permissions,
      isActive: payload.isActive,
    });

    await writeAuditLog({
      userId: context.actor?.id,
      action: 'CREATE',
      entityType: 'STAFF',
      entityId: id,
      details: { email: payload.email, permissions: payload.permissions },
      ipAddress: context.ipAddress,
      connection,
    });

    return id;
  });

  return getStaff(staffId);
}

export async function updateStaffMember(staffId, payload, context = {}) {
  const staff = await getStaff(staffId);

  if (payload.email && payload.email !== staff.email) {
    const existing = await findUserByEmail(payload.email);

    if (existing) {
      throw new ApiError(409, 'An account with this email already exists.');
    }
  }

  const passwordHash = payload.password
    ? await hashPassword(payload.password)
    : undefined;

  await withTransaction(async (connection) => {
    await updateStaff(connection, staffId, {
      name: payload.name,
      email: payload.email,
      permissions: payload.permissions,
      isActive: payload.isActive,
      passwordHash,
    });

    await writeAuditLog({
      userId: context.actor?.id,
      action: 'UPDATE',
      entityType: 'STAFF',
      entityId: staffId,
      details: {
        changedFields: Object.keys(payload).filter(
          (field) => payload[field] !== undefined,
        ),
      },
      ipAddress: context.ipAddress,
      connection,
    });
  });

  return getStaff(staffId);
}
