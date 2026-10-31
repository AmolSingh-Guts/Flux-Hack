import pool from '../config/database.js';
import { currentMonthRange, todayString } from '../utils/date.utils.js';

function monthKeys(count = 12) {
  const now = new Date();
  const keys = [];

  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1),
    );
    keys.push(date.toISOString().slice(0, 7));
  }

  return keys;
}

function monthLabel(key) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(`${key}-01T00:00:00.000Z`));
}

function fillMonths(keys, rows, valueKey) {
  const byMonth = new Map(
    rows.map((row) => [row.month, Number(row[valueKey] ?? 0)]),
  );

  return keys.map((key) => ({
    month: key,
    label: monthLabel(key),
    value: byMonth.get(key) ?? 0,
  }));
}

function normaliseRange(range = {}) {
  const fallback = currentMonthRange();
  const from = range.from ?? fallback.from;
  const to = range.to ?? fallback.to;

  return from > to ? { from: to, to: from } : { from, to };
}

export async function adminDashboard(range = {}) {
  const { from, to } = normaliseRange(range);
  const keys = monthKeys(12);

  const [
    [customerRows],
    [productRows],
    [subscriptionRows],
    [revenueRows],
    [rangeRevenueRows],
    [pendingRows],
    [overdueRows],
    [invoiceRows],
    [mrrRows],
    [recentPaymentRows],
    [recentSubscriptionRows],
    [revenueChartRows],
    [subscriptionGrowthRows],
    [invoiceStatusRows],
    [upcomingRows],
  ] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) AS total,
              SUM(status = 'ACTIVE') AS active,
              SUM(registration_date BETWEEN ? AND ?) AS new_in_range
       FROM customers`,
      [from, to],
    ),
    pool.query(
      `SELECT COUNT(*) AS total, SUM(status = 'ACTIVE') AS active FROM products`,
    ),
    pool.query(
      `SELECT COUNT(*) AS total,
              SUM(status = 'ACTIVE') AS active,
              SUM(status = 'PAUSED') AS paused,
              SUM(status = 'CLOSED') AS cancelled,
              SUM(start_date BETWEEN ? AND ?) AS new_in_range
       FROM subscriptions`,
      [from, to],
    ),
    pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM payments WHERE status = 'COMPLETED'`,
    ),
    pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM payments
       WHERE status = 'COMPLETED' AND payment_date BETWEEN ? AND ?`,
      [from, to],
    ),
    pool.query(
      `SELECT COUNT(*) AS count, COALESCE(SUM(balance_due), 0) AS amount
       FROM invoices
       WHERE status IN ('CONFIRMED', 'PARTIALLY_PAID', 'OVERDUE')`,
    ),
    pool.query(
      `SELECT COUNT(*) AS count, COALESCE(SUM(balance_due), 0) AS amount
       FROM invoices WHERE status = 'OVERDUE'`,
    ),
    pool.query(
      `SELECT COUNT(*) AS total,
              SUM(status = 'PAID') AS paid,
              SUM(status = 'DRAFT') AS draft
       FROM invoices`,
    ),
    pool.query(
      `SELECT COALESCE(SUM(
        CASE p.billing_frequency
          WHEN 'DAILY' THEN s.total_amount * 30
          WHEN 'WEEKLY' THEN s.total_amount * 4.3333
          WHEN 'MONTHLY' THEN s.total_amount
          WHEN 'YEARLY' THEN s.total_amount / 12
          ELSE 0
        END
      ), 0) AS mrr
       FROM subscriptions s
       INNER JOIN plans p ON p.id = s.plan_id
       WHERE s.status = 'ACTIVE'`,
    ),
    pool.query(
      `SELECT pay.id, pay.payment_number, pay.amount, pay.payment_date,
              pay.payment_method, c.name AS customer_name,
              i.invoice_number, i.currency
       FROM payments pay
       INNER JOIN customers c ON c.id = pay.customer_id
       INNER JOIN invoices i ON i.id = pay.invoice_id
       WHERE pay.status = 'COMPLETED'
       ORDER BY pay.payment_date DESC, pay.id DESC
       LIMIT 6`,
    ),
    pool.query(
      `SELECT s.id, s.subscription_number, s.status, s.start_date,
              s.next_billing_date, s.total_amount, s.currency,
              c.name AS customer_name, p.name AS plan_name
       FROM subscriptions s
       INNER JOIN customers c ON c.id = s.customer_id
       INNER JOIN plans p ON p.id = s.plan_id
       ORDER BY s.created_at DESC, s.id DESC
       LIMIT 6`,
    ),
    pool.query(
      `SELECT DATE_FORMAT(payment_date, '%Y-%m') AS month,
              COALESCE(SUM(amount), 0) AS revenue
       FROM payments
       WHERE status = 'COMPLETED' AND payment_date >= ?
       GROUP BY month
       ORDER BY month`,
      [`${keys[0]}-01`],
    ),
    pool.query(
      `SELECT DATE_FORMAT(start_date, '%Y-%m') AS month,
              COUNT(*) AS subscriptions
       FROM subscriptions
       WHERE start_date >= ?
       GROUP BY month
       ORDER BY month`,
      [`${keys[0]}-01`],
    ),
    pool.query(
      `SELECT status, COUNT(*) AS count, COALESCE(SUM(total_amount), 0) AS amount
       FROM invoices
       GROUP BY status`,
    ),
    pool.query(
      `SELECT s.id, s.subscription_number, s.next_billing_date, s.total_amount,
              s.currency, c.name AS customer_name, p.name AS plan_name
       FROM subscriptions s
       INNER JOIN customers c ON c.id = s.customer_id
       INNER JOIN plans p ON p.id = s.plan_id
       WHERE s.status = 'ACTIVE' AND s.next_billing_date IS NOT NULL
       ORDER BY s.next_billing_date ASC
       LIMIT 6`,
    ),
  ]);

  return {
    range: { from, to },
    cards: {
      totalCustomers: Number(customerRows[0].total),
      activeCustomers: Number(customerRows[0].active ?? 0),
      newCustomers: Number(customerRows[0].new_in_range ?? 0),
      totalProducts: Number(productRows[0].total),
      activeProducts: Number(productRows[0].active ?? 0),
      totalSubscriptions: Number(subscriptionRows[0].total),
      activeSubscriptions: Number(subscriptionRows[0].active ?? 0),
      pausedSubscriptions: Number(subscriptionRows[0].paused ?? 0),
      cancelledSubscriptions: Number(subscriptionRows[0].cancelled ?? 0),
      newSubscriptions: Number(subscriptionRows[0].new_in_range ?? 0),
      totalRevenue: Number(revenueRows[0].total),
      rangeRevenue: Number(rangeRevenueRows[0].total),
      mrr: Number(mrrRows[0].mrr),
      pendingPayments: Number(pendingRows[0].amount),
      pendingPaymentsCount: Number(pendingRows[0].count),
      overdueInvoices: Number(overdueRows[0].count),
      overdueAmount: Number(overdueRows[0].amount),
      totalInvoices: Number(invoiceRows[0].total),
      paidInvoices: Number(invoiceRows[0].paid ?? 0),
      draftInvoices: Number(invoiceRows[0].draft ?? 0),
    },
    revenueChart: fillMonths(keys, revenueChartRows, 'revenue'),
    subscriptionGrowth: fillMonths(
      keys,
      subscriptionGrowthRows,
      'subscriptions',
    ),
    invoiceStatus: invoiceStatusRows.map((row) => ({
      status: row.status,
      count: Number(row.count),
      amount: Number(row.amount),
    })),
    recentPayments: recentPaymentRows,
    recentSubscriptions: recentSubscriptionRows,
    upcomingRenewals: upcomingRows,
  };
}

export async function staffDashboard(user, range = {}) {
  const { from, to } = normaliseRange(range);
  const permissions = user.permissions ?? [];

  const [[customerRows]] = await pool.query(
    `SELECT COUNT(*) AS total,
            SUM(status = 'ACTIVE') AS active,
            SUM(registration_date BETWEEN ? AND ?) AS new_in_range
     FROM customers`,
    [from, to],
  );
  const [[quotationRows]] = await pool.query(
    `SELECT COUNT(*) AS total,
            SUM(status IN ('DRAFT', 'SENT')) AS open,
            SUM(status = 'ACCEPTED') AS accepted
     FROM quotations
     WHERE created_at BETWEEN ? AND ?`,
    [`${from} 00:00:00`, `${to} 23:59:59`],
  );
  const [[subscriptionRows]] = await pool.query(
    `SELECT COUNT(*) AS total,
            SUM(status = 'ACTIVE') AS active,
            SUM(status = 'PAUSED') AS paused
     FROM subscriptions
     WHERE start_date BETWEEN ? AND ?`,
    [from, to],
  );
  const [[invoiceRows]] = await pool.query(
    `SELECT COUNT(*) AS total,
            SUM(status = 'OVERDUE') AS overdue,
            COALESCE(SUM(balance_due), 0) AS outstanding
     FROM invoices
     WHERE invoice_date BETWEEN ? AND ?`,
    [from, to],
  );
  const [[paymentRows]] = await pool.query(
    `SELECT COUNT(*) AS total, COALESCE(SUM(amount), 0) AS amount
     FROM payments
     WHERE status = 'COMPLETED' AND payment_date BETWEEN ? AND ?`,
    [from, to],
  );

  const [recentSubscriptions] = await pool.query(
    `SELECT s.id, s.subscription_number, s.status, s.start_date,
            s.next_billing_date, s.total_amount, s.currency,
            c.name AS customer_name, p.name AS plan_name
     FROM subscriptions s
     INNER JOIN customers c ON c.id = s.customer_id
     INNER JOIN plans p ON p.id = s.plan_id
     ORDER BY s.created_at DESC, s.id DESC
     LIMIT 6`,
  );
  const [recentInvoices] = await pool.query(
    `SELECT i.id, i.invoice_number, i.status, i.invoice_date, i.due_date,
            i.total_amount, i.balance_due, i.currency, c.name AS customer_name
     FROM invoices i
     INNER JOIN customers c ON c.id = i.customer_id
     ORDER BY i.created_at DESC, i.id DESC
     LIMIT 6`,
  );

  return {
    range: { from, to },
    permissions,
    cards: {
      totalCustomers: Number(customerRows.total),
      activeCustomers: Number(customerRows.active ?? 0),
      newCustomers: Number(customerRows.new_in_range ?? 0),
      totalQuotations: Number(quotationRows.total),
      openQuotations: Number(quotationRows.open ?? 0),
      acceptedQuotations: Number(quotationRows.accepted ?? 0),
      totalSubscriptions: Number(subscriptionRows.total),
      activeSubscriptions: Number(subscriptionRows.active ?? 0),
      pausedSubscriptions: Number(subscriptionRows.paused ?? 0),
      totalInvoices: Number(invoiceRows.total),
      overdueInvoices: Number(invoiceRows.overdue ?? 0),
      outstandingAmount: Number(invoiceRows.outstanding),
      paymentsRecorded: Number(paymentRows.total),
      paymentsAmount: Number(paymentRows.amount),
    },
    recentSubscriptions,
    recentInvoices,
  };
}

export async function customerDashboard(customerId) {
  const [[subscriptionRows]] = await pool.query(
    `SELECT COUNT(*) AS total,
            SUM(status = 'ACTIVE') AS active,
            SUM(status = 'PAUSED') AS paused
     FROM subscriptions WHERE customer_id = ?`,
    [customerId],
  );
  const [[invoiceRows]] = await pool.query(
    `SELECT COUNT(*) AS total,
            SUM(status = 'OVERDUE') AS overdue,
            SUM(status = 'PAID') AS paid,
            COALESCE(SUM(balance_due), 0) AS outstanding,
            COALESCE(SUM(total_amount), 0) AS billed
     FROM invoices WHERE customer_id = ?`,
    [customerId],
  );
  const [[paymentRows]] = await pool.query(
    `SELECT COUNT(*) AS total, COALESCE(SUM(amount), 0) AS amount
     FROM payments WHERE customer_id = ? AND status = 'COMPLETED'`,
    [customerId],
  );
  const [[nextBilling]] = await pool.query(
    `SELECT MIN(next_billing_date) AS next_billing_date
     FROM subscriptions
     WHERE customer_id = ? AND status = 'ACTIVE' AND next_billing_date IS NOT NULL`,
    [customerId],
  );

  const [recentInvoices] = await pool.query(
    `SELECT id, invoice_number, status, invoice_date, due_date,
            total_amount, amount_paid, balance_due, currency
     FROM invoices
     WHERE customer_id = ?
     ORDER BY invoice_date DESC, id DESC
     LIMIT 5`,
    [customerId],
  );
  const [recentPayments] = await pool.query(
    `SELECT p.id, p.payment_number, p.amount, p.payment_date, p.payment_method,
            i.invoice_number, i.currency
     FROM payments p
     INNER JOIN invoices i ON i.id = p.invoice_id
     WHERE p.customer_id = ? AND p.status = 'COMPLETED'
     ORDER BY p.payment_date DESC, p.id DESC
     LIMIT 5`,
    [customerId],
  );
  const [subscriptions] = await pool.query(
    `SELECT s.id, s.subscription_number, s.status, s.start_date, s.expiry_date,
            s.next_billing_date, s.total_amount, s.currency, p.name AS plan_name
     FROM subscriptions s
     INNER JOIN plans p ON p.id = s.plan_id
     WHERE s.customer_id = ?
     ORDER BY s.created_at DESC`,
    [customerId],
  );

  return {
    cards: {
      totalSubscriptions: Number(subscriptionRows.total),
      activeSubscriptions: Number(subscriptionRows.active ?? 0),
      pausedSubscriptions: Number(subscriptionRows.paused ?? 0),
      totalInvoices: Number(invoiceRows.total),
      paidInvoices: Number(invoiceRows.paid ?? 0),
      overdueInvoices: Number(invoiceRows.overdue ?? 0),
      outstandingAmount: Number(invoiceRows.outstanding),
      billedAmount: Number(invoiceRows.billed),
      totalPaid: Number(paymentRows.amount),
      paymentsCount: Number(paymentRows.total),
      nextBillingDate: nextBilling?.next_billing_date ?? null,
    },
    recentInvoices,
    recentPayments,
    subscriptions,
    generatedAt: todayString(),
  };
}
