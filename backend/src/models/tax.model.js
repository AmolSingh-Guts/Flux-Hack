import pool from '../config/database.js';

export async function listTaxRules({ search, isActive, page, limit, offset, sortBy, sortOrder }) {
  const conditions = ['1 = 1'];
  const parameters = [];

  if (search) {
    conditions.push('(name LIKE ? OR tax_type LIKE ?)');
    parameters.push(`%${search}%`, `%${search}%`);
  }

  if (isActive !== undefined) {
    conditions.push('is_active = ?');
    parameters.push(isActive ? 1 : 0);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const allowedSort = {
    name: 'name',
    percentage: 'percentage',
    tax_type: 'tax_type',
    is_active: 'is_active',
    created_at: 'created_at',
  };
  const orderColumn = allowedSort[sortBy] ?? 'created_at';

  const [[countRow]] = await pool.query(
    `SELECT COUNT(*) AS total FROM tax_rules ${where}`,
    parameters,
  );
  const [rows] = await pool.query(
    `SELECT tr.*,
       (SELECT COUNT(*) FROM product_taxes pt WHERE pt.tax_rule_id = tr.id) AS product_count
     FROM tax_rules tr
     ${where}
     ORDER BY ${orderColumn} ${sortOrder}
     LIMIT ? OFFSET ?`,
    [...parameters, limit, offset],
  );

  return { rows, total: countRow.total };
}

export async function findTaxRuleById(id, connection = pool) {
  const [rows] = await connection.query(
    'SELECT * FROM tax_rules WHERE id = ? LIMIT 1',
    [id],
  );

  return rows[0] ?? null;
}

export async function findTaxRulesByIds(ids, connection = pool) {
  if (!ids.length) {
    return [];
  }

  const placeholders = ids.map(() => '?').join(', ');
  const [rows] = await connection.query(
    `SELECT * FROM tax_rules WHERE id IN (${placeholders})`,
    ids,
  );

  return rows;
}

export async function createTaxRule(connection, tax) {
  const [result] = await connection.query(
    `INSERT INTO tax_rules (name, percentage, tax_type, description, is_active)
     VALUES (?, ?, ?, ?, ?)`,
    [
      tax.name,
      tax.percentage,
      tax.taxType,
      tax.description ?? null,
      tax.isActive === false ? 0 : 1,
    ],
  );

  return result.insertId;
}

export async function updateTaxRule(connection, taxId, tax) {
  const fieldMap = {
    name: 'name',
    percentage: 'percentage',
    taxType: 'tax_type',
    description: 'description',
    isActive: 'is_active',
  };
  const fields = [];
  const parameters = [];

  for (const [key, column] of Object.entries(fieldMap)) {
    if (tax[key] !== undefined) {
      fields.push(`${column} = ?`);
      parameters.push(key === 'isActive' ? (tax[key] ? 1 : 0) : tax[key]);
    }
  }

  if (fields.length === 0) {
    return;
  }

  parameters.push(taxId);
  await connection.query(
    `UPDATE tax_rules SET ${fields.join(', ')} WHERE id = ?`,
    parameters,
  );
}

export async function deleteTaxRule(connection, taxId) {
  await connection.query('DELETE FROM tax_rules WHERE id = ?', [taxId]);
}

export async function listAllActiveTaxes() {
  const [rows] = await pool.query(
    `SELECT id, name, percentage, tax_type, description
     FROM tax_rules
     WHERE is_active = 1
     ORDER BY name`,
  );

  return rows;
}
