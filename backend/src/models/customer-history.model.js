import pool from '../config/database.js';

export async function listCustomerSubscriptions(customerId) {
  const [rows] = await pool.query(
    `SELECT s.id, s.subscription_number, s.status, s.start_date, s.expiry_date,
            s.next_billing_date, s.total_amount, s.currency, p.name AS plan_name
     FROM subscriptions s
     INNER JOIN plans p ON p.id = s.plan_id
     WHERE s.customer_id = ?
     ORDER BY s.created_at DESC
     LIMIT 50`,
    [customerId],
  );

  return rows;
}

export async function listCustomerInvoices(customerId) {
  const [rows] = await pool.query(
    `SELECT id, invoice_number, status, invoice_date, due_date, total_amount,
            amount_paid, balance_due, currency
     FROM invoices
     WHERE customer_id = ?
     ORDER BY invoice_date DESC, id DESC
     LIMIT 50`,
    [customerId],
  );

  return rows;
}

export async function listCustomerPayments(customerId) {
  const [rows] = await pool.query(
    `SELECT pay.id, pay.payment_number, pay.amount, pay.payment_date,
            pay.payment_method, pay.transaction_reference, i.invoice_number
     FROM payments pay
     INNER JOIN invoices i ON i.id = pay.invoice_id
     WHERE pay.customer_id = ? AND pay.status = 'COMPLETED'
     ORDER BY pay.payment_date DESC, pay.id DESC
     LIMIT 50`,
    [customerId],
  );

  return rows;
}

export async function listCustomerQuotations(customerId) {
  const [rows] = await pool.query(
    `SELECT id, quotation_number, status, valid_until, total_amount, currency
     FROM quotations
     WHERE customer_id = ?
     ORDER BY created_at DESC
     LIMIT 50`,
    [customerId],
  );

  return rows;
}

export async function customerPortalSummary(customerId) {
  const [[subscriptionRow]] = await pool.query(
    `SELECT
      COUNT(*) AS total,
      SUM(status = 'ACTIVE') AS active,
      SUM(status = 'PAUSED') AS paused
     FROM subscriptions WHERE customer_id = ?`,
    [customerId],
  );
  const [[invoiceRow]] = await pool.query(
    `SELECT
      COUNT(*) AS total,
      COALESCE(SUM(balance_due), 0) AS outstanding,
      SUM(status = 'OVERDUE') AS overdue
     FROM invoices WHERE customer_id = ?`,
    [customerId],
  );
  const [[paymentRow]] = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM payments WHERE customer_id = ? AND status = 'COMPLETED'`,
    [customerId],
  );

  return {
    subscriptions: subscriptionRow,
    invoices: invoiceRow,
    payments: paymentRow,
  };
}
