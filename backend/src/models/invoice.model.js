import pool from '../config/database.js';

export async function markOverdueInvoices(connection = pool) {
  await connection.query(
    `UPDATE invoices
     SET status = 'OVERDUE'
     WHERE status IN ('CONFIRMED', 'PARTIALLY_PAID')
       AND balance_due > 0
       AND due_date < CURRENT_DATE`,
  );
}

export async function listInvoices({
  search,
  status,
  customerId,
  subscriptionId,
  from,
  to,
  overdueOnly,
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
      '(i.invoice_number LIKE ? OR c.name LIKE ? OR c.company_name LIKE ?)',
    );
    parameters.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (status) {
    conditions.push('i.status = ?');
    parameters.push(status);
  }

  if (customerId) {
    conditions.push('i.customer_id = ?');
    parameters.push(customerId);
  }

  if (subscriptionId) {
    conditions.push('i.subscription_id = ?');
    parameters.push(subscriptionId);
  }

  if (from) {
    conditions.push('i.invoice_date >= ?');
    parameters.push(from);
  }

  if (to) {
    conditions.push('i.invoice_date <= ?');
    parameters.push(to);
  }

  if (overdueOnly) {
    conditions.push("i.status = 'OVERDUE'");
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const allowedSort = {
    invoice_number: 'i.invoice_number',
    customer_name: 'c.name',
    status: 'i.status',
    invoice_date: 'i.invoice_date',
    due_date: 'i.due_date',
    total_amount: 'i.total_amount',
    balance_due: 'i.balance_due',
    created_at: 'i.created_at',
  };
  const orderColumn = allowedSort[sortBy] ?? 'i.invoice_date';

  const [[countRow]] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM invoices i
     INNER JOIN customers c ON c.id = i.customer_id
     ${where}`,
    parameters,
  );
  const [rows] = await pool.query(
    `SELECT i.*, c.name AS customer_name, c.email AS customer_email,
            c.company_name, s.subscription_number,
            (SELECT COUNT(*) FROM payments p
              WHERE p.invoice_id = i.id AND p.status = 'COMPLETED') AS payment_count
     FROM invoices i
     INNER JOIN customers c ON c.id = i.customer_id
     LEFT JOIN subscriptions s ON s.id = i.subscription_id
     ${where}
     ORDER BY ${orderColumn} ${sortOrder}, i.id DESC
     LIMIT ? OFFSET ?`,
    [...parameters, limit, offset],
  );

  return { rows, total: countRow.total };
}

export async function findInvoiceById(id, connection = pool) {
  const [rows] = await connection.query(
    `SELECT i.*, c.name AS customer_name, c.email AS customer_email,
            c.company_name, c.address AS customer_address, c.city AS customer_city,
            c.state AS customer_state, c.country AS customer_country,
            c.gst_number AS customer_gst_number,
            s.subscription_number, s.payment_terms_days,
            d.name AS discount_name, d.discount_type, d.discount_value,
            u.name AS created_by_name
     FROM invoices i
     INNER JOIN customers c ON c.id = i.customer_id
     LEFT JOIN subscriptions s ON s.id = i.subscription_id
     LEFT JOIN discounts d ON d.id = i.discount_id
     LEFT JOIN users u ON u.id = i.created_by
     WHERE i.id = ?
     LIMIT 1`,
    [id],
  );

  if (!rows[0]) {
    return null;
  }

  const [lines] = await connection.query(
    `SELECT il.*, p.name AS product_name, pv.name AS variant_name
     FROM invoice_lines il
     LEFT JOIN products p ON p.id = il.product_id
     LEFT JOIN product_variants pv ON pv.id = il.variant_id
     WHERE il.invoice_id = ?
     ORDER BY il.sort_order ASC, il.id ASC`,
    [id],
  );

  const [payments] = await connection.query(
    `SELECT p.*, u.name AS recorded_by_name,
            (SELECT COUNT(*) FROM payment_transactions pt
              WHERE pt.payment_id = p.id AND pt.status = 'VERIFIED') AS verified_transactions
     FROM payments p
     LEFT JOIN users u ON u.id = p.recorded_by
     WHERE p.invoice_id = ?
     ORDER BY p.payment_date DESC, p.id DESC`,
    [id],
  );

  return { ...rows[0], lines, payments };
}

export async function findInvoiceForUpdate(connection, id) {
  const [rows] = await connection.query(
    'SELECT * FROM invoices WHERE id = ? FOR UPDATE',
    [id],
  );

  return rows[0] ?? null;
}

export async function findInvoiceBySubscriptionPeriod(
  connection,
  subscriptionId,
  billingPeriodStart,
) {
  const [rows] = await connection.query(
    `SELECT id, invoice_number FROM invoices
     WHERE subscription_id = ? AND billing_period_start = ?
     LIMIT 1`,
    [subscriptionId, billingPeriodStart],
  );

  return rows[0] ?? null;
}

export async function createInvoice(connection, invoice) {
  const [result] = await connection.query(
    `INSERT INTO invoices
      (invoice_number, customer_id, subscription_id, status, invoice_date, due_date,
       billing_period_start, billing_period_end, subtotal, discount_id, discount_amount,
       tax_amount, total_amount, amount_paid, balance_due, currency, notes, created_by,
       confirmed_at, cancelled_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      invoice.invoiceNumber,
      invoice.customerId,
      invoice.subscriptionId ?? null,
      invoice.status ?? 'DRAFT',
      invoice.invoiceDate,
      invoice.dueDate,
      invoice.billingPeriodStart ?? null,
      invoice.billingPeriodEnd ?? null,
      invoice.subtotal,
      invoice.discountId ?? null,
      invoice.discountAmount,
      invoice.taxAmount,
      invoice.totalAmount,
      invoice.amountPaid ?? 0,
      invoice.balanceDue ?? invoice.totalAmount,
      invoice.currency ?? 'INR',
      invoice.notes ?? null,
      invoice.createdBy ?? null,
      invoice.confirmedAt ?? null,
      invoice.cancelledAt ?? null,
    ],
  );

  return result.insertId;
}

export async function insertInvoiceLines(connection, invoiceId, lines) {
  if (lines.length === 0) {
    return;
  }

  const values = [];
  const parameters = [];

  for (const line of lines) {
    values.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    parameters.push(
      invoiceId,
      line.productId ?? null,
      line.variantId ?? null,
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
    `INSERT INTO invoice_lines
      (invoice_id, product_id, variant_id, description, quantity, unit_price,
       tax_rate, tax_amount, discount_amount, line_total, sort_order)
     VALUES ${values.join(', ')}`,
    parameters,
  );
}

export async function updateInvoice(connection, invoiceId, invoice) {
  const fieldMap = {
    status: 'status',
    invoiceDate: 'invoice_date',
    dueDate: 'due_date',
    subtotal: 'subtotal',
    discountId: 'discount_id',
    discountAmount: 'discount_amount',
    taxAmount: 'tax_amount',
    totalAmount: 'total_amount',
    amountPaid: 'amount_paid',
    balanceDue: 'balance_due',
    notes: 'notes',
    confirmedAt: 'confirmed_at',
    cancelledAt: 'cancelled_at',
  };
  const fields = [];
  const parameters = [];

  for (const [key, column] of Object.entries(fieldMap)) {
    if (invoice[key] !== undefined) {
      fields.push(`${column} = ?`);
      parameters.push(invoice[key]);
    }
  }

  if (fields.length === 0) {
    return;
  }

  parameters.push(invoiceId);
  await connection.query(
    `UPDATE invoices SET ${fields.join(', ')} WHERE id = ?`,
    parameters,
  );
}

export async function replaceInvoiceLines(connection, invoiceId, lines) {
  await connection.query('DELETE FROM invoice_lines WHERE invoice_id = ?', [
    invoiceId,
  ]);
  await insertInvoiceLines(connection, invoiceId, lines);
}

export async function paymentTotalsForInvoice(connection, invoiceId) {
  const [rows] = await connection.query(
    `SELECT COALESCE(SUM(p.amount), 0) AS amount_paid
     FROM payments p
     INNER JOIN payment_transactions pt ON pt.payment_id = p.id
     WHERE p.invoice_id = ?
       AND p.status = 'COMPLETED'
       AND pt.status = 'VERIFIED'`,
    [invoiceId],
  );

  return Number(rows[0].amount_paid);
}

export async function invoiceDependencyCounts(invoiceId, connection = pool) {
  const [rows] = await connection.query(
    `SELECT
      (SELECT COUNT(*) FROM payments WHERE invoice_id = ? AND status = 'COMPLETED') AS payments,
      (SELECT COUNT(*) FROM payment_transactions pt
        INNER JOIN payments p ON p.id = pt.payment_id
        WHERE p.invoice_id = ? AND p.status = 'COMPLETED') AS transactions`,
    [invoiceId, invoiceId],
  );

  return rows[0];
}

export async function deleteInvoice(connection, invoiceId) {
  await connection.query('DELETE FROM invoices WHERE id = ?', [invoiceId]);
}

export async function findInvoicesForCustomer(customerId) {
  const [rows] = await pool.query(
    `SELECT i.*, s.subscription_number
     FROM invoices i
     LEFT JOIN subscriptions s ON s.id = i.subscription_id
     WHERE i.customer_id = ?
     ORDER BY i.invoice_date DESC, i.id DESC`,
    [customerId],
  );

  return rows;
}
