import pool from '../config/database.js';

export async function listPayments({
  search,
  paymentMethod,
  customerId,
  invoiceId,
  from,
  to,
  page,
  limit,
  offset,
  sortBy,
  sortOrder,
}) {
  const conditions = ["p.status = 'COMPLETED'"];
  const parameters = [];

  if (search) {
    conditions.push(
      '(p.payment_number LIKE ? OR p.transaction_reference LIKE ? OR c.name LIKE ? OR i.invoice_number LIKE ?)',
    );
    parameters.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (paymentMethod) {
    conditions.push('p.payment_method = ?');
    parameters.push(paymentMethod);
  }

  if (customerId) {
    conditions.push('p.customer_id = ?');
    parameters.push(customerId);
  }

  if (invoiceId) {
    conditions.push('p.invoice_id = ?');
    parameters.push(invoiceId);
  }

  if (from) {
    conditions.push('p.payment_date >= ?');
    parameters.push(from);
  }

  if (to) {
    conditions.push('p.payment_date <= ?');
    parameters.push(to);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const allowedSort = {
    payment_number: 'p.payment_number',
    customer_name: 'c.name',
    amount: 'p.amount',
    payment_date: 'p.payment_date',
    payment_method: 'p.payment_method',
    created_at: 'p.created_at',
  };
  const orderColumn = allowedSort[sortBy] ?? 'p.payment_date';

  const [[countRow]] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM payments p
     INNER JOIN customers c ON c.id = p.customer_id
     INNER JOIN invoices i ON i.id = p.invoice_id
     ${where}`,
    parameters,
  );
  const [rows] = await pool.query(
    `SELECT p.*, c.name AS customer_name, c.company_name,
            i.invoice_number, i.total_amount AS invoice_total,
            i.balance_due AS invoice_balance_due, i.currency,
            (SELECT COUNT(*) FROM payment_transactions pt
              WHERE pt.payment_id = p.id AND pt.status = 'VERIFIED') AS verified_transactions
     FROM payments p
     INNER JOIN customers c ON c.id = p.customer_id
     INNER JOIN invoices i ON i.id = p.invoice_id
     ${where}
     ORDER BY ${orderColumn} ${sortOrder}, p.id DESC
     LIMIT ? OFFSET ?`,
    [...parameters, limit, offset],
  );

  return { rows, total: countRow.total };
}

export async function findPaymentById(id, connection = pool) {
  const [rows] = await connection.query(
    `SELECT p.*, c.name AS customer_name, c.email AS customer_email,
            c.company_name, c.address AS customer_address, c.city AS customer_city,
            c.state AS customer_state, c.country AS customer_country,
            i.invoice_number, i.total_amount AS invoice_total,
            i.amount_paid AS invoice_amount_paid, i.balance_due AS invoice_balance_due,
            i.currency, i.status AS invoice_status,
            u.name AS recorded_by_name
     FROM payments p
     INNER JOIN customers c ON c.id = p.customer_id
     INNER JOIN invoices i ON i.id = p.invoice_id
     LEFT JOIN users u ON u.id = p.recorded_by
     WHERE p.id = ?
     LIMIT 1`,
    [id],
  );

  if (!rows[0]) {
    return null;
  }

  const [transactions] = await connection.query(
    `SELECT * FROM payment_transactions
     WHERE payment_id = ?
     ORDER BY created_at ASC, id ASC`,
    [id],
  );

  return { ...rows[0], transactions };
}

export async function findPaymentForUpdate(connection, id) {
  const [rows] = await connection.query(
    'SELECT * FROM payments WHERE id = ? FOR UPDATE',
    [id],
  );

  return rows[0] ?? null;
}

export async function createPayment(connection, payment) {
  const [result] = await connection.query(
    `INSERT INTO payments
      (payment_number, invoice_id, customer_id, payment_method, amount,
       payment_date, transaction_reference, notes, status, recorded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?)`,
    [
      payment.paymentNumber,
      payment.invoiceId,
      payment.customerId,
      payment.paymentMethod,
      payment.amount,
      payment.paymentDate,
      payment.transactionReference ?? null,
      payment.notes ?? null,
      payment.recordedBy ?? null,
    ],
  );

  return result.insertId;
}

export async function createPaymentTransaction(connection, transaction) {
  const [result] = await connection.query(
    `INSERT INTO payment_transactions
      (payment_id, transaction_reference, amount, status, provider, metadata, verified_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      transaction.paymentId,
      transaction.transactionReference ?? null,
      transaction.amount,
      transaction.status,
      transaction.provider ?? 'MANUAL',
      transaction.metadata ? JSON.stringify(transaction.metadata) : null,
      transaction.verifiedAt ?? null,
    ],
  );

  return result.insertId;
}

export async function voidPayment(connection, paymentId) {
  await connection.query(
    "UPDATE payments SET status = 'VOID' WHERE id = ?",
    [paymentId],
  );
}

export async function listPaymentsForCustomer(customerId) {
  const [rows] = await pool.query(
    `SELECT p.*, i.invoice_number, i.currency,
            i.total_amount AS invoice_total, i.balance_due AS invoice_balance_due
     FROM payments p
     INNER JOIN invoices i ON i.id = p.invoice_id
     WHERE p.customer_id = ?
     ORDER BY p.payment_date DESC, p.id DESC`,
    [customerId],
  );

  return rows;
}

export async function paymentSummaryForCustomer(customerId) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total_payments,
            COALESCE(SUM(amount), 0) AS total_paid
     FROM payments
     WHERE customer_id = ? AND status = 'COMPLETED'`,
    [customerId],
  );

  return rows[0];
}
