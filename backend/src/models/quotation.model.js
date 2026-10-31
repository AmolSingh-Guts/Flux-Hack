import pool from '../config/database.js';
import { todayString } from '../utils/date.utils.js';

export async function expireQuotations() {
  await pool.query(
    `UPDATE quotations
     SET status = 'EXPIRED'
     WHERE status IN ('DRAFT', 'SENT')
       AND valid_until < CURRENT_DATE`,
  );
}

export async function listQuotations({
  search,
  status,
  customerId,
  from,
  to,
  page,
  limit,
  offset,
  sortBy,
  sortOrder,
}) {
  const conditions = ['1 = 1'];
  const parameters = [];

  if (search) {
    conditions.push(
      '(q.quotation_number LIKE ? OR c.name LIKE ? OR c.company_name LIKE ?)',
    );
    parameters.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (status) {
    conditions.push('q.status = ?');
    parameters.push(status);
  }

  if (customerId) {
    conditions.push('q.customer_id = ?');
    parameters.push(customerId);
  }

  if (from) {
    conditions.push('q.created_at >= ?');
    parameters.push(`${from} 00:00:00`);
  }

  if (to) {
    conditions.push('q.created_at <= ?');
    parameters.push(`${to} 23:59:59`);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const allowedSort = {
    quotation_number: 'q.quotation_number',
    customer_name: 'c.name',
    status: 'q.status',
    valid_until: 'q.valid_until',
    total_amount: 'q.total_amount',
    created_at: 'q.created_at',
  };
  const orderColumn = allowedSort[sortBy] ?? 'q.created_at';

  const [[countRow]] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM quotations q
     INNER JOIN customers c ON c.id = q.customer_id
     ${where}`,
    parameters,
  );
  const [rows] = await pool.query(
    `SELECT q.*, c.name AS customer_name, c.company_name,
            s.id AS subscription_id, s.subscription_number
     FROM quotations q
     INNER JOIN customers c ON c.id = q.customer_id
     LEFT JOIN subscriptions s ON s.quotation_id = q.id
     ${where}
     ORDER BY ${orderColumn} ${sortOrder}
     LIMIT ? OFFSET ?`,
    [...parameters, limit, offset],
  );

  return { rows, total: countRow.total };
}

export async function findQuotationById(id, connection = pool) {
  const [rows] = await connection.query(
    `SELECT q.*, c.name AS customer_name, c.email AS customer_email,
            c.company_name, c.address AS customer_address, c.city AS customer_city,
            c.state AS customer_state, c.country AS customer_country,
            c.gst_number AS customer_gst_number,
            qt.name AS template_name, qt.header_text, qt.footer_text, qt.terms_text,
            s.id AS subscription_id, s.subscription_number,
            u.name AS created_by_name
     FROM quotations q
     INNER JOIN customers c ON c.id = q.customer_id
     LEFT JOIN quotation_templates qt ON qt.id = q.template_id
     LEFT JOIN subscriptions s ON s.quotation_id = q.id
     LEFT JOIN users u ON u.id = q.created_by
     WHERE q.id = ?
     LIMIT 1`,
    [id],
  );

  if (!rows[0]) {
    return null;
  }

  const [lineRows] = await connection.query(
    `SELECT ql.*, p.name AS product_name, pv.name AS variant_name,
            pl.name AS plan_name
     FROM quotation_lines ql
     INNER JOIN products p ON p.id = ql.product_id
     LEFT JOIN product_variants pv ON pv.id = ql.variant_id
     LEFT JOIN plans pl ON pl.id = ql.plan_id
     WHERE ql.quotation_id = ?
     ORDER BY ql.sort_order ASC, ql.id ASC`,
    [id],
  );

  return { ...rows[0], lines: lineRows };
}

export async function createQuotation(connection, quotation) {
  const [result] = await connection.query(
    `INSERT INTO quotations
      (quotation_number, customer_id, template_id, status, validity_days, valid_until,
       subtotal, discount_amount, tax_amount, total_amount, currency, notes, created_by,
       sent_at, accepted_at, rejected_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      quotation.quotationNumber,
      quotation.customerId,
      quotation.templateId ?? null,
      quotation.status ?? 'DRAFT',
      quotation.validityDays,
      quotation.validUntil,
      quotation.subtotal,
      quotation.discountAmount,
      quotation.taxAmount,
      quotation.totalAmount,
      quotation.currency,
      quotation.notes ?? null,
      quotation.createdBy ?? null,
      quotation.sentAt ?? null,
      quotation.acceptedAt ?? null,
      quotation.rejectedAt ?? null,
    ],
  );

  return result.insertId;
}

export async function insertQuotationLines(connection, quotationId, lines) {
  const values = [];
  const parameters = [];

  for (const line of lines) {
    values.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    parameters.push(
      quotationId,
      line.productId,
      line.variantId ?? null,
      line.planId ?? null,
      line.description,
      line.quantity,
      line.unitPrice,
      line.taxRate,
      line.taxAmount,
      line.discountAmount,
      line.lineTotal,
      line.sortOrder,
    );
  }

  await connection.query(
    `INSERT INTO quotation_lines
      (quotation_id, product_id, variant_id, plan_id, description, quantity, unit_price,
       tax_rate, tax_amount, discount_amount, line_total, sort_order)
     VALUES ${values.join(', ')}`,
    parameters,
  );
}

export async function updateQuotation(connection, quotationId, quotation) {
  const fields = [];
  const parameters = [];

  for (const [key, column] of Object.entries({
    customerId: 'customer_id',
    templateId: 'template_id',
    validityDays: 'validity_days',
    validUntil: 'valid_until',
    subtotal: 'subtotal',
    discountAmount: 'discount_amount',
    taxAmount: 'tax_amount',
    totalAmount: 'total_amount',
    notes: 'notes',
  })) {
    if (quotation[key] !== undefined) {
      fields.push(`${column} = ?`);
      parameters.push(quotation[key]);
    }
  }

  if (fields.length === 0) {
    return;
  }

  parameters.push(quotationId);
  await connection.query(
    `UPDATE quotations SET ${fields.join(', ')} WHERE id = ?`,
    parameters,
  );
}

export async function replaceQuotationLines(connection, quotationId, lines) {
  await connection.query('DELETE FROM quotation_lines WHERE quotation_id = ?', [
    quotationId,
  ]);
  await insertQuotationLines(connection, quotationId, lines);
}

export async function updateQuotationStatus(
  connection,
  quotationId,
  status,
  timestamps = {},
) {
  const fields = ['status = ?'];
  const parameters = [status];

  if (timestamps.sentAt !== undefined) {
    fields.push('sent_at = ?');
    parameters.push(timestamps.sentAt);
  }

  if (timestamps.acceptedAt !== undefined) {
    fields.push('accepted_at = ?');
    parameters.push(timestamps.acceptedAt);
  }

  if (timestamps.rejectedAt !== undefined) {
    fields.push('rejected_at = ?');
    parameters.push(timestamps.rejectedAt);
  }

  parameters.push(quotationId);
  await connection.query(
    `UPDATE quotations SET ${fields.join(', ')} WHERE id = ?`,
    parameters,
  );
}

export async function listQuotationTemplates() {
  const [rows] = await pool.query(
    `SELECT * FROM quotation_templates
     WHERE is_active = 1
     ORDER BY is_default DESC, name ASC`,
  );

  return rows;
}

export async function findQuotationTemplateById(id) {
  const [rows] = await pool.query(
    'SELECT * FROM quotation_templates WHERE id = ? AND is_active = 1 LIMIT 1',
    [id],
  );

  return rows[0] ?? null;
}

export async function markQuotationExpiredIfNeeded(quotationId, connection = pool) {
  await connection.query(
    `UPDATE quotations
     SET status = 'EXPIRED'
     WHERE id = ?
       AND status IN ('DRAFT', 'SENT')
       AND valid_until < ?`,
    [quotationId, todayString()],
  );
}
