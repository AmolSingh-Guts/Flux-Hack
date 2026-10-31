import pool from '../config/database.js';

export async function listSubscriptions({
  search,
  status,
  customerId,
  planId,
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
      '(s.subscription_number LIKE ? OR c.name LIKE ? OR c.company_name LIKE ? OR p.name LIKE ?)',
    );
    parameters.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (status) {
    conditions.push('s.status = ?');
    parameters.push(status);
  }

  if (customerId) {
    conditions.push('s.customer_id = ?');
    parameters.push(customerId);
  }

  if (planId) {
    conditions.push('s.plan_id = ?');
    parameters.push(planId);
  }

  if (from) {
    conditions.push('s.start_date >= ?');
    parameters.push(from);
  }

  if (to) {
    conditions.push('s.start_date <= ?');
    parameters.push(to);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const allowedSort = {
    subscription_number: 's.subscription_number',
    customer_name: 'c.name',
    plan_name: 'p.name',
    status: 's.status',
    start_date: 's.start_date',
    expiry_date: 's.expiry_date',
    next_billing_date: 's.next_billing_date',
    total_amount: 's.total_amount',
    created_at: 's.created_at',
  };
  const orderColumn = allowedSort[sortBy] ?? 's.created_at';

  const [[countRow]] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM subscriptions s
     INNER JOIN customers c ON c.id = s.customer_id
     INNER JOIN plans p ON p.id = s.plan_id
     ${where}`,
    parameters,
  );
  const [rows] = await pool.query(
    `SELECT s.*, c.name AS customer_name, c.email AS customer_email,
            c.company_name, p.name AS plan_name, p.billing_frequency,
            (SELECT COUNT(*) FROM invoices i WHERE i.subscription_id = s.id) AS invoice_count,
            (SELECT COALESCE(SUM(i.balance_due), 0) FROM invoices i
              WHERE i.subscription_id = s.id
                AND i.status IN ('CONFIRMED', 'PARTIALLY_PAID', 'OVERDUE')) AS outstanding_amount
     FROM subscriptions s
     INNER JOIN customers c ON c.id = s.customer_id
     INNER JOIN plans p ON p.id = s.plan_id
     ${where}
     ORDER BY ${orderColumn} ${sortOrder}
     LIMIT ? OFFSET ?`,
    [...parameters, limit, offset],
  );

  return { rows, total: countRow.total };
}

export async function findSubscriptionById(id, connection = pool) {
  const [rows] = await connection.query(
    `SELECT s.*, c.name AS customer_name, c.email AS customer_email,
            c.company_name, c.address AS customer_address, c.city AS customer_city,
            c.state AS customer_state, c.country AS customer_country,
            c.gst_number AS customer_gst_number,
            p.name AS plan_name, p.billing_frequency, p.minimum_quantity,
            p.allow_pause, p.allow_renewal, p.allow_early_closure, p.auto_close,
            p.end_date AS plan_end_date,
            q.quotation_number,
            u.name AS created_by_name,
            (SELECT COALESCE(SUM(i.balance_due), 0) FROM invoices i
              WHERE i.subscription_id = s.id
                AND i.status IN ('CONFIRMED', 'PARTIALLY_PAID', 'OVERDUE')) AS outstanding_amount
     FROM subscriptions s
     INNER JOIN customers c ON c.id = s.customer_id
     INNER JOIN plans p ON p.id = s.plan_id
     LEFT JOIN quotations q ON q.id = s.quotation_id
     LEFT JOIN users u ON u.id = s.created_by
     WHERE s.id = ?
     LIMIT 1`,
    [id],
  );

  if (!rows[0]) {
    return null;
  }

  const [lines] = await connection.query(
    `SELECT sl.*, pr.name AS product_name, pv.name AS variant_name,
            pl.name AS plan_name
     FROM subscription_lines sl
     INNER JOIN products pr ON pr.id = sl.product_id
     LEFT JOIN product_variants pv ON pv.id = sl.variant_id
     LEFT JOIN plans pl ON pl.id = sl.plan_id
     WHERE sl.subscription_id = ?
     ORDER BY sl.sort_order ASC, sl.id ASC`,
    [id],
  );

  const [history] = await connection.query(
    `SELECT sh.*, u.name AS performed_by_name
     FROM subscription_history sh
     LEFT JOIN users u ON u.id = sh.performed_by
     WHERE sh.subscription_id = ?
     ORDER BY sh.created_at ASC, sh.id ASC`,
    [id],
  );

  const [invoices] = await connection.query(
    `SELECT id, invoice_number, status, invoice_date, due_date, total_amount,
            amount_paid, balance_due, billing_period_start, billing_period_end
     FROM invoices
     WHERE subscription_id = ?
     ORDER BY invoice_date DESC, id DESC`,
    [id],
  );

  return { ...rows[0], lines, history, invoices };
}

export async function findSubscriptionForUpdate(connection, id) {
  const [rows] = await connection.query(
    `SELECT s.*, p.billing_frequency, p.allow_pause, p.allow_renewal,
            p.allow_early_closure, p.auto_close, p.end_date AS plan_end_date,
            p.minimum_quantity
     FROM subscriptions s
     INNER JOIN plans p ON p.id = s.plan_id
     WHERE s.id = ?
     FOR UPDATE`,
    [id],
  );

  return rows[0] ?? null;
}

export async function createSubscription(connection, subscription) {
  const [result] = await connection.query(
    `INSERT INTO subscriptions
      (subscription_number, customer_id, plan_id, quotation_id, status, start_date,
       expiry_date, next_billing_date, payment_terms_days, subtotal, discount_amount,
       tax_amount, total_amount, currency, notes, paused_at, closed_at, close_reason, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      subscription.subscriptionNumber,
      subscription.customerId,
      subscription.planId,
      subscription.quotationId ?? null,
      subscription.status ?? 'DRAFT',
      subscription.startDate,
      subscription.expiryDate,
      subscription.nextBillingDate ?? null,
      subscription.paymentTermsDays ?? 30,
      subscription.subtotal,
      subscription.discountAmount,
      subscription.taxAmount,
      subscription.totalAmount,
      subscription.currency ?? 'INR',
      subscription.notes ?? null,
      subscription.pausedAt ?? null,
      subscription.closedAt ?? null,
      subscription.closeReason ?? null,
      subscription.createdBy ?? null,
    ],
  );

  return result.insertId;
}

export async function insertSubscriptionLines(connection, subscriptionId, lines) {
  if (lines.length === 0) {
    return;
  }

  const values = [];
  const parameters = [];

  for (const line of lines) {
    values.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    parameters.push(
      subscriptionId,
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
    `INSERT INTO subscription_lines
      (subscription_id, product_id, variant_id, plan_id, description, quantity,
       unit_price, tax_rate, tax_amount, discount_amount, line_total, sort_order)
     VALUES ${values.join(', ')}`,
    parameters,
  );
}

export async function updateSubscription(connection, subscriptionId, subscription) {
  const fieldMap = {
    customerId: 'customer_id',
    planId: 'plan_id',
    startDate: 'start_date',
    expiryDate: 'expiry_date',
    nextBillingDate: 'next_billing_date',
    paymentTermsDays: 'payment_terms_days',
    subtotal: 'subtotal',
    discountAmount: 'discount_amount',
    taxAmount: 'tax_amount',
    totalAmount: 'total_amount',
    notes: 'notes',
  };
  const fields = [];
  const parameters = [];

  for (const [key, column] of Object.entries(fieldMap)) {
    if (subscription[key] !== undefined) {
      fields.push(`${column} = ?`);
      parameters.push(subscription[key]);
    }
  }

  if (fields.length === 0) {
    return;
  }

  parameters.push(subscriptionId);
  await connection.query(
    `UPDATE subscriptions SET ${fields.join(', ')} WHERE id = ?`,
    parameters,
  );
}

export async function replaceSubscriptionLines(connection, subscriptionId, lines) {
  await connection.query('DELETE FROM subscription_lines WHERE subscription_id = ?', [
    subscriptionId,
  ]);
  await insertSubscriptionLines(connection, subscriptionId, lines);
}

export async function updateSubscriptionState(connection, subscriptionId, changes) {
  const fieldMap = {
    status: 'status',
    nextBillingDate: 'next_billing_date',
    expiryDate: 'expiry_date',
    pausedAt: 'paused_at',
    closedAt: 'closed_at',
    closeReason: 'close_reason',
    startDate: 'start_date',
    paymentTermsDays: 'payment_terms_days',
  };
  const fields = [];
  const parameters = [];

  for (const [key, column] of Object.entries(fieldMap)) {
    if (changes[key] !== undefined) {
      fields.push(`${column} = ?`);
      parameters.push(changes[key]);
    }
  }

  if (fields.length === 0) {
    return;
  }

  parameters.push(subscriptionId);
  await connection.query(
    `UPDATE subscriptions SET ${fields.join(', ')} WHERE id = ?`,
    parameters,
  );
}

export async function addSubscriptionHistory(connection, entry) {
  await connection.query(
    `INSERT INTO subscription_history
      (subscription_id, action, from_status, to_status, notes, performed_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      entry.subscriptionId,
      entry.action,
      entry.fromStatus ?? null,
      entry.toStatus ?? null,
      entry.notes ?? null,
      entry.performedBy ?? null,
    ],
  );
}

export async function subscriptionDependencyCounts(
  subscriptionId,
  connection = pool,
) {
  const [rows] = await connection.query(
    'SELECT COUNT(*) AS invoices FROM invoices WHERE subscription_id = ?',
    [subscriptionId],
  );

  return rows[0];
}

export async function deleteSubscription(connection, subscriptionId) {
  await connection.query('DELETE FROM subscriptions WHERE id = ?', [
    subscriptionId,
  ]);
}

export async function findDueSubscriptions(billingDate, connection = pool) {
  const [rows] = await connection.query(
    `SELECT s.*, p.billing_frequency, p.auto_close, p.end_date AS plan_end_date
     FROM subscriptions s
     INNER JOIN plans p ON p.id = s.plan_id
     WHERE s.status = 'ACTIVE'
       AND s.next_billing_date IS NOT NULL
       AND s.next_billing_date <= ?
     ORDER BY s.next_billing_date ASC, s.id ASC`,
    [billingDate],
  );

  return rows;
}

export async function findSubscriptionsForCustomer(customerId) {
  const [rows] = await pool.query(
    `SELECT s.*, p.name AS plan_name, p.billing_frequency,
            (SELECT COALESCE(SUM(i.balance_due), 0) FROM invoices i
              WHERE i.subscription_id = s.id
                AND i.status IN ('CONFIRMED', 'PARTIALLY_PAID', 'OVERDUE')) AS outstanding_amount
     FROM subscriptions s
     INNER JOIN plans p ON p.id = s.plan_id
     WHERE s.customer_id = ?
     ORDER BY s.created_at DESC`,
    [customerId],
  );

  return rows;
}

export async function findSubscriptionForCustomer(subscriptionId, customerId) {
  const subscription = await findSubscriptionById(subscriptionId);

  if (!subscription || String(subscription.customer_id) !== String(customerId)) {
    return null;
  }

  return subscription;
}
