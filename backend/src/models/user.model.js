import pool from '../config/database.js';

function parsePermissions(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

function mapUser(row) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    is_active: Boolean(row.is_active),
    permissions: parsePermissions(row.permissions),
  };
}

export async function findUserById(id, connection = pool) {
  const [rows] = await connection.query(
    `SELECT u.*, c.name AS customer_name, c.company_name
     FROM users u
     LEFT JOIN customers c ON c.id = u.customer_id
     WHERE u.id = ?
     LIMIT 1`,
    [id],
  );

  return mapUser(rows[0]);
}

export async function findUserByEmail(email) {
  const [rows] = await pool.query(
    `SELECT u.*, c.name AS customer_name, c.company_name
     FROM users u
     LEFT JOIN customers c ON c.id = u.customer_id
     WHERE u.email = ?
     LIMIT 1`,
    [email],
  );

  return mapUser(rows[0]);
}

export async function createUser(connection, user) {
  const [result] = await connection.query(
    `INSERT INTO users
      (name, email, password_hash, role, customer_id, permissions, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      user.name,
      user.email,
      user.passwordHash,
      user.role,
      user.customerId ?? null,
      user.permissions ? JSON.stringify(user.permissions) : null,
      user.isActive === false ? 0 : 1,
    ],
  );

  return result.insertId;
}

export async function updateLastLogin(userId, connection = pool) {
  await connection.query(
    'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?',
    [userId],
  );
}

export async function updatePassword(userId, passwordHash, connection = pool) {
  await connection.query(
    'UPDATE users SET password_hash = ? WHERE id = ?',
    [passwordHash, userId],
  );
}

export async function updateUserProfile(
  userId,
  { name, email },
  connection = pool,
) {
  const fields = [];
  const parameters = [];

  if (name !== undefined) {
    fields.push('name = ?');
    parameters.push(name);
  }

  if (email !== undefined) {
    fields.push('email = ?');
    parameters.push(email);
  }

  if (fields.length === 0) {
    return;
  }

  parameters.push(userId);
  await connection.query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
    parameters,
  );
}

export async function createPasswordResetToken(connection, token) {
  await connection.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES (?, ?, ?)`,
    [token.userId, token.tokenHash, token.expiresAt],
  );
}

export async function findValidPasswordResetToken(tokenHash) {
  const [rows] = await pool.query(
    `SELECT prt.*, u.email, u.name, u.role, u.is_active
     FROM password_reset_tokens prt
     INNER JOIN users u ON u.id = prt.user_id
     WHERE prt.token_hash = ?
       AND prt.used_at IS NULL
       AND prt.expires_at > CURRENT_TIMESTAMP
     LIMIT 1`,
    [tokenHash],
  );

  return rows[0] ?? null;
}

export async function markPasswordResetTokenUsed(connection, tokenId) {
  await connection.query(
    'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?',
    [tokenId],
  );
}

export async function deleteExpiredPasswordResetTokens() {
  await pool.query(
    'DELETE FROM password_reset_tokens WHERE expires_at < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 DAY)',
  );
}

export async function listStaff({ search, page, limit, offset, sortBy, sortOrder }) {
  const conditions = ["u.role = 'STAFF'"];
  const parameters = [];

  if (search) {
    conditions.push('(u.name LIKE ? OR u.email LIKE ?)');
    parameters.push(`%${search}%`, `%${search}%`);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const allowedSort = {
    name: 'u.name',
    email: 'u.email',
    is_active: 'u.is_active',
    created_at: 'u.created_at',
    last_login_at: 'u.last_login_at',
  };
  const orderColumn = allowedSort[sortBy] ?? 'u.created_at';

  const [[countRow]] = await pool.query(
    `SELECT COUNT(*) AS total FROM users u ${where}`,
    parameters,
  );
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.permissions, u.is_active,
            u.last_login_at, u.created_at, u.updated_at
     FROM users u
     ${where}
     ORDER BY ${orderColumn} ${sortOrder}
     LIMIT ? OFFSET ?`,
    [...parameters, limit, offset],
  );

  return {
    rows: rows.map(mapUser),
    total: countRow.total,
  };
}

export async function updateStaff(connection, userId, changes) {
  const fields = [];
  const parameters = [];

  if (changes.name !== undefined) {
    fields.push('name = ?');
    parameters.push(changes.name);
  }

  if (changes.email !== undefined) {
    fields.push('email = ?');
    parameters.push(changes.email);
  }

  if (changes.permissions !== undefined) {
    fields.push('permissions = ?');
    parameters.push(JSON.stringify(changes.permissions));
  }

  if (changes.isActive !== undefined) {
    fields.push('is_active = ?');
    parameters.push(changes.isActive ? 1 : 0);
  }

  if (changes.passwordHash !== undefined) {
    fields.push('password_hash = ?');
    parameters.push(changes.passwordHash);
  }

  if (fields.length === 0) {
    return;
  }

  parameters.push(userId);
  await connection.query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = ? AND role = 'STAFF'`,
    parameters,
  );
}
