import pool from '../config/database.js';

export async function writeAuditLog({
  userId = null,
  action,
  entityType,
  entityId = null,
  details = null,
  ipAddress = null,
  connection = pool,
}) {
  await connection.query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      userId,
      action,
      entityType,
      entityId,
      details ? JSON.stringify(details) : null,
      ipAddress,
    ],
  );
}

export function requestIp(request) {
  return (
    request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    request.ip ||
    request.socket?.remoteAddress ||
    null
  );
}
