import pool from '../config/database.js';
import { currentMonthRange, differenceInDays, todayString } from '../utils/date.utils.js';
import { toCsv } from '../utils/csv.utils.js';

function normaliseRange(range = {}) {
  const fallback = currentMonthRange();
  const from = range.from ?? fallback.from;
  const to = range.to ?? fallback.to;

  return from > to ? { from: to, to: from } : { from, to };
}

export async function reportSummary(query = {}) {
  const { from, to } = normaliseRange(query);

  const [
    [revenueRows],
    [allRevenueRows],
    [subscriptionRows],
    [customerRows],
    [invoiceRows],
    [paymentRows],
    [monthlyRevenueRows],
    [yearlyRevenueRows],
    [paymentMethodRows],
    [subscriptionGrowthRows],
    [invoiceStatusRows],
    [topCustomerRows],
  ] = await Promise.all([
    pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS payments
       FROM payments
       WHERE status = 'COMPLETED' AND payment_date BETWEEN ? AND ?`,
      [from, to],
    ),
    pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM payments WHERE status = 'COMPLETED'`,
    ),
    pool.query(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(status = 'ACTIVE'), 0) AS active,
              COALESCE(SUM(status = 'PAUSED'), 0) AS paused,
              COALESCE(SUM(status = 'CLOSED'), 0) AS closed,
              COALESCE(SUM(status = 'CONFIRMED'), 0) AS confirmed,
              COALESCE(SUM(start_date BETWEEN ? AND ?), 0) AS new_in_range,
              COALESCE(SUM(closed_at IS NOT NULL AND DATE(closed_at) BETWEEN ? AND ?), 0) AS closed_in_range
       FROM subscriptions`,
      [from, to, from, to],
    ),
    pool.query(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(status = 'ACTIVE'), 0) AS active,
              COALESCE(SUM(registration_date BETWEEN ? AND ?), 0) AS new_in_range
       FROM customers`,
      [from, to],
    ),
    pool.query(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(status = 'PAID'), 0) AS paid,
              COALESCE(SUM(status = 'OVERDUE'), 0) AS overdue,
              COALESCE(SUM(status = 'PARTIALLY_PAID'), 0) AS partially_paid,
              COALESCE(SUM(balance_due), 0) AS outstanding
       FROM invoices`,
    ),
    pool.query(
      `SELECT COUNT(*) AS total, COALESCE(SUM(amount), 0) AS amount
       FROM payments
       WHERE status = 'COMPLETED' AND payment_date BETWEEN ? AND ?`,
      [from, to],
    ),
    pool.query(
      `SELECT DATE_FORMAT(payment_date, '%Y-%m') AS month,
              COALESCE(SUM(amount), 0) AS revenue,
              COUNT(*) AS payments
       FROM payments
       WHERE status = 'COMPLETED' AND payment_date BETWEEN ? AND ?
       GROUP BY month ORDER BY month`,
      [from, to],
    ),
    pool.query(
      `SELECT YEAR(payment_date) AS year,
              COALESCE(SUM(amount), 0) AS revenue,
              COUNT(*) AS payments
       FROM payments
       WHERE status = 'COMPLETED' AND payment_date BETWEEN ? AND ?
       GROUP BY year ORDER BY year`,
      [from, to],
    ),
    pool.query(
      `SELECT payment_method AS method, COUNT(*) AS count,
              COALESCE(SUM(amount), 0) AS amount
       FROM payments
       WHERE status = 'COMPLETED' AND payment_date BETWEEN ? AND ?
       GROUP BY payment_method ORDER BY amount DESC`,
      [from, to],
    ),
    pool.query(
      `SELECT DATE_FORMAT(start_date, '%Y-%m') AS month, COUNT(*) AS subscriptions
       FROM subscriptions
       WHERE start_date BETWEEN ? AND ?
       GROUP BY month ORDER BY month`,
      [from, to],
    ),
    pool.query(
      `SELECT status, COUNT(*) AS count, COALESCE(SUM(total_amount), 0) AS amount
       FROM invoices GROUP BY status`,
    ),
    pool.query(
      `SELECT c.id, c.name, c.company_name,
              COALESCE(SUM(p.amount), 0) AS revenue,
              COUNT(p.id) AS payments
       FROM payments p
       INNER JOIN customers c ON c.id = p.customer_id
       WHERE p.status = 'COMPLETED' AND p.payment_date BETWEEN ? AND ?
       GROUP BY c.id, c.name, c.company_name
       ORDER BY revenue DESC
       LIMIT 8`,
      [from, to],
    ),
  ]);

  return {
    range: { from, to },
    cards: {
      totalRevenue: Number(revenueRows[0].total),
      allTimeRevenue: Number(allRevenueRows[0].total),
      paymentsInRange: Number(revenueRows[0].payments),
      activeSubscriptions: Number(subscriptionRows[0].active),
      cancelledSubscriptions: Number(subscriptionRows[0].closed_in_range),
      totalClosedSubscriptions: Number(subscriptionRows[0].closed),
      newSubscriptions: Number(subscriptionRows[0].new_in_range),
      newCustomers: Number(customerRows[0].new_in_range),
      totalCustomers: Number(customerRows[0].total),
      outstandingPayments: Number(invoiceRows[0].outstanding),
      overdueInvoices: Number(invoiceRows[0].overdue),
      paidInvoices: Number(invoiceRows[0].paid),
      partiallyPaidInvoices: Number(invoiceRows[0].partially_paid),
      paymentAmountInRange: Number(paymentRows[0].amount),
      averagePayment:
        Number(paymentRows[0].total) > 0
          ? Number(paymentRows[0].amount) / Number(paymentRows[0].total)
          : 0,
    },
    monthlyRevenue: monthlyRevenueRows.map((row) => ({
      month: row.month,
      revenue: Number(row.revenue),
      payments: Number(row.payments),
    })),
    yearlyRevenue: yearlyRevenueRows.map((row) => ({
      year: String(row.year),
      revenue: Number(row.revenue),
      payments: Number(row.payments),
    })),
    paymentMethods: paymentMethodRows.map((row) => ({
      method: row.method,
      count: Number(row.count),
      amount: Number(row.amount),
    })),
    subscriptionGrowth: subscriptionGrowthRows.map((row) => ({
      month: row.month,
      subscriptions: Number(row.subscriptions),
    })),
    invoiceStatus: invoiceStatusRows.map((row) => ({
      status: row.status,
      count: Number(row.count),
      amount: Number(row.amount),
    })),
    topCustomers: topCustomerRows.map((row) => ({
      id: row.id,
      name: row.name,
      companyName: row.company_name,
      revenue: Number(row.revenue),
      payments: Number(row.payments),
    })),
  };
}

export async function exportReport({ type, from, to, search = '' }) {
  const range = normaliseRange({ from, to });
  const searchTerm = `%${search}%`;

  if (type === 'revenue') {
    const [rows] = await pool.query(
      `SELECT DATE_FORMAT(payment_date, '%Y-%m') AS month,
              COALESCE(SUM(amount), 0) AS revenue,
              COUNT(*) AS payments
       FROM payments
       WHERE status = 'COMPLETED' AND payment_date BETWEEN ? AND ?
       GROUP BY month ORDER BY month`,
      [range.from, range.to],
    );

    return {
      filename: `revenue-${range.from}-to-${range.to}.csv`,
      csv: toCsv(rows, [
        { key: 'month', label: 'Month' },
        { key: 'revenue', label: 'Revenue' },
        { key: 'payments', label: 'Payments' },
      ]),
    };
  }

  if (type === 'payments') {
    const [rows] = await pool.query(
      `SELECT p.payment_number, p.payment_date, c.name AS customer,
              i.invoice_number, p.payment_method, p.transaction_reference, p.amount
       FROM payments p
       INNER JOIN customers c ON c.id = p.customer_id
       INNER JOIN invoices i ON i.id = p.invoice_id
       WHERE p.status = 'COMPLETED' AND p.payment_date BETWEEN ? AND ?
         AND (c.name LIKE ? OR p.payment_number LIKE ? OR i.invoice_number LIKE ?)
       ORDER BY p.payment_date DESC
       LIMIT 5000`,
      [range.from, range.to, searchTerm, searchTerm, searchTerm],
    );

    return {
      filename: `payments-${range.from}-to-${range.to}.csv`,
      csv: toCsv(rows, [
        { key: 'payment_number', label: 'Payment Number' },
        { key: 'payment_date', label: 'Payment Date' },
        { key: 'customer', label: 'Customer' },
        { key: 'invoice_number', label: 'Invoice' },
        { key: 'payment_method', label: 'Method' },
        { key: 'transaction_reference', label: 'Reference' },
        { key: 'amount', label: 'Amount' },
      ]),
    };
  }

  if (type === 'subscriptions') {
    const [rows] = await pool.query(
      `SELECT s.subscription_number, c.name AS customer, p.name AS plan,
              s.status, s.start_date, s.expiry_date, s.next_billing_date, s.total_amount
       FROM subscriptions s
       INNER JOIN customers c ON c.id = s.customer_id
       INNER JOIN plans p ON p.id = s.plan_id
       WHERE s.start_date BETWEEN ? AND ?
         AND (s.subscription_number LIKE ? OR c.name LIKE ? OR p.name LIKE ?)
       ORDER BY s.start_date DESC
       LIMIT 5000`,
      [range.from, range.to, searchTerm, searchTerm, searchTerm],
    );

    return {
      filename: `subscriptions-${range.from}-to-${range.to}.csv`,
      csv: toCsv(rows, [
        { key: 'subscription_number', label: 'Subscription' },
        { key: 'customer', label: 'Customer' },
        { key: 'plan', label: 'Plan' },
        { key: 'status', label: 'Status' },
        { key: 'start_date', label: 'Start Date' },
        { key: 'expiry_date', label: 'Expiry Date' },
        { key: 'next_billing_date', label: 'Next Billing' },
        { key: 'total_amount', label: 'Total' },
      ]),
    };
  }

  if (type === 'invoices') {
    const [rows] = await pool.query(
      `SELECT i.invoice_number, c.name AS customer, i.status, i.invoice_date,
              i.due_date, i.total_amount, i.amount_paid, i.balance_due
       FROM invoices i
       INNER JOIN customers c ON c.id = i.customer_id
       WHERE i.invoice_date BETWEEN ? AND ?
         AND (i.invoice_number LIKE ? OR c.name LIKE ?)
       ORDER BY i.invoice_date DESC
       LIMIT 5000`,
      [range.from, range.to, searchTerm, searchTerm],
    );

    return {
      filename: `invoices-${range.from}-to-${range.to}.csv`,
      csv: toCsv(rows, [
        { key: 'invoice_number', label: 'Invoice' },
        { key: 'customer', label: 'Customer' },
        { key: 'status', label: 'Status' },
        { key: 'invoice_date', label: 'Invoice Date' },
        { key: 'due_date', label: 'Due Date' },
        { key: 'total_amount', label: 'Total' },
        { key: 'amount_paid', label: 'Paid' },
        { key: 'balance_due', label: 'Balance' },
      ]),
    };
  }

  if (type === 'customers') {
    const [rows] = await pool.query(
      `SELECT name, email, company_name, phone, city, state, status, registration_date
       FROM customers
       WHERE registration_date BETWEEN ? AND ?
         AND (name LIKE ? OR email LIKE ? OR company_name LIKE ?)
       ORDER BY registration_date DESC
       LIMIT 5000`,
      [range.from, range.to, searchTerm, searchTerm, searchTerm],
    );

    return {
      filename: `customers-${range.from}-to-${range.to}.csv`,
      csv: toCsv(rows, [
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'company_name', label: 'Company' },
        { key: 'phone', label: 'Phone' },
        { key: 'city', label: 'City' },
        { key: 'state', label: 'State' },
        { key: 'status', label: 'Status' },
        { key: 'registration_date', label: 'Registered' },
      ]),
    };
  }

  if (type === 'overdue') {
    const today = todayString();
    const [rows] = await pool.query(
      `SELECT i.invoice_number, c.name AS customer, i.due_date,
              i.balance_due, i.currency, i.status
       FROM invoices i
       INNER JOIN customers c ON c.id = i.customer_id
       WHERE i.status = 'OVERDUE'
         AND (i.invoice_number LIKE ? OR c.name LIKE ?)
       ORDER BY i.due_date ASC
       LIMIT 5000`,
      [searchTerm, searchTerm],
    );

    return {
      filename: `overdue-invoices-${today}.csv`,
      csv: toCsv(
        rows.map((row) => ({
          ...row,
          days_overdue: Math.max(0, differenceInDays(row.due_date, today)),
        })),
        [
          { key: 'invoice_number', label: 'Invoice' },
          { key: 'customer', label: 'Customer' },
          { key: 'due_date', label: 'Due Date' },
          { key: 'days_overdue', label: 'Days Overdue' },
          { key: 'balance_due', label: 'Balance' },
          { key: 'currency', label: 'Currency' },
        ],
      ),
    };
  }

  throw new Error('Unsupported report export type.');
}
