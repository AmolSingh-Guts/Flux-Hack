import pool from '../config/database.js';
import { todayString } from '../utils/date.utils.js';

const planSelect = `
  SELECT p.*,
    pr.id AS price_id,
    pr.price,
    pr.currency,
    pr.effective_from,
    prod.name AS product_name,
    prod.sales_price AS product_sales_price,
    (SELECT COUNT(*) FROM subscriptions s WHERE s.plan_id = p.id) AS subscription_count
  FROM plans p
  INNER JOIN products prod ON prod.id = p.product_id
  LEFT JOIN plan_prices pr
    ON pr.plan_id = p.id
   AND pr.effective_to IS NULL
   AND pr.effective_from <= CURRENT_DATE
`;

export async function listPlans({
  search,
  status,
  productId,
  billingFrequency,
  page,
  limit,
  offset,
  sortBy,
  sortOrder,
}) {
  const conditions = ['1 = 1'];
  const parameters = [];

  if (search) {
    conditions.push('(p.name LIKE ? OR prod.name LIKE ? OR p.description LIKE ?)');
    parameters.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (status) {
    conditions.push('p.status = ?');
    parameters.push(status);
  }

  if (productId) {
    conditions.push('p.product_id = ?');
    parameters.push(productId);
  }

  if (billingFrequency) {
    conditions.push('p.billing_frequency = ?');
    parameters.push(billingFrequency);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const allowedSort = {
    name: 'p.name',
    product_name: 'prod.name',
    billing_frequency: 'p.billing_frequency',
    price: 'pr.price',
    status: 'p.status',
    created_at: 'p.created_at',
  };
  const orderColumn = allowedSort[sortBy] ?? 'p.created_at';

  const [[countRow]] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM plans p
     INNER JOIN products prod ON prod.id = p.product_id
     ${where}`,
    parameters,
  );
  const [rows] = await pool.query(
    `${planSelect}
     ${where}
     ORDER BY ${orderColumn} ${sortOrder}
     LIMIT ? OFFSET ?`,
    [...parameters, limit, offset],
  );

  return { rows, total: countRow.total };
}

export async function findPlanById(id, connection = pool) {
  const [rows] = await connection.query(
    `${planSelect}
     WHERE p.id = ?
     LIMIT 1`,
    [id],
  );

  return rows[0] ?? null;
}

export async function findPlansForSelect(search = '') {
  const [rows] = await pool.query(
    `${planSelect}
     WHERE p.status = 'ACTIVE'
       AND (p.name LIKE ? OR prod.name LIKE ?)
     ORDER BY p.name ASC
     LIMIT 100`,
    [`%${search}%`, `%${search}%`],
  );

  return rows;
}

export async function createPlan(connection, plan) {
  const [result] = await connection.query(
    `INSERT INTO plans
      (name, product_id, billing_frequency, minimum_quantity, start_date, end_date,
       auto_close, allow_early_closure, allow_pause, allow_renewal, status, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      plan.name,
      plan.productId,
      plan.billingFrequency,
      plan.minQuantity,
      plan.startDate,
      plan.endDate ?? null,
      plan.autoClose ? 1 : 0,
      plan.allowEarlyClosure ? 1 : 0,
      plan.allowPause ? 1 : 0,
      plan.allowRenewal ? 1 : 0,
      plan.status,
      plan.description ?? null,
    ],
  );

  return result.insertId;
}

export async function updatePlan(connection, planId, plan) {
  const fieldMap = {
    name: 'name',
    productId: 'product_id',
    billingFrequency: 'billing_frequency',
    minQuantity: 'minimum_quantity',
    startDate: 'start_date',
    endDate: 'end_date',
    status: 'status',
    description: 'description',
  };
  const booleanMap = {
    autoClose: 'auto_close',
    allowEarlyClosure: 'allow_early_closure',
    allowPause: 'allow_pause',
    allowRenewal: 'allow_renewal',
  };
  const fields = [];
  const parameters = [];

  for (const [key, column] of Object.entries(fieldMap)) {
    if (plan[key] !== undefined) {
      fields.push(`${column} = ?`);
      parameters.push(plan[key]);
    }
  }

  for (const [key, column] of Object.entries(booleanMap)) {
    if (plan[key] !== undefined) {
      fields.push(`${column} = ?`);
      parameters.push(plan[key] ? 1 : 0);
    }
  }

  if (fields.length === 0) {
    return;
  }

  parameters.push(planId);
  await connection.query(
    `UPDATE plans SET ${fields.join(', ')} WHERE id = ?`,
    parameters,
  );
}

export async function setPlanPrice(connection, planId, price, currency = 'INR') {
  const today = todayString();
  const [rows] = await connection.query(
    `SELECT id, price, effective_from
     FROM plan_prices
     WHERE plan_id = ? AND effective_to IS NULL
     ORDER BY effective_from DESC
     LIMIT 1
     FOR UPDATE`,
    [planId],
  );

  if (rows[0]?.effective_from === today) {
    await connection.query(
      'UPDATE plan_prices SET price = ?, currency = ? WHERE id = ?',
      [price, currency, rows[0].id],
    );
    return;
  }

  await connection.query(
    `UPDATE plan_prices
     SET effective_to = ?
     WHERE plan_id = ? AND effective_to IS NULL`,
    [today, planId],
  );
  await connection.query(
    `INSERT INTO plan_prices (plan_id, price, currency, effective_from, effective_to)
     VALUES (?, ?, ?, ?, NULL)`,
    [planId, price, currency, today],
  );
}

export async function planDependencyCounts(planId, connection = pool) {
  const [rows] = await connection.query(
    'SELECT COUNT(*) AS subscriptions FROM subscriptions WHERE plan_id = ?',
    [planId],
  );

  return rows[0];
}

export async function deletePlan(connection, planId) {
  await connection.query('DELETE FROM plans WHERE id = ?', [planId]);
}

export async function findCurrentPlanPrice(planId, connection = pool) {
  const [rows] = await connection.query(
    `SELECT price, currency
     FROM plan_prices
     WHERE plan_id = ?
       AND effective_to IS NULL
       AND effective_from <= CURRENT_DATE
     ORDER BY effective_from DESC
     LIMIT 1`,
    [planId],
  );

  return rows[0] ?? null;
}
