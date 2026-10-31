import pool from '../config/database.js';
import { todayString } from '../utils/date.utils.js';

async function attachDiscountRelations(discounts) {
  if (discounts.length === 0) {
    return discounts;
  }

  const ids = discounts.map((discount) => discount.id);
  const placeholders = ids.map(() => '?').join(', ');
  const [productRows] = await pool.query(
    `SELECT discount_id, product_id FROM discount_products
     WHERE discount_id IN (${placeholders})`,
    ids,
  );
  const [subscriptionRows] = await pool.query(
    `SELECT discount_id, subscription_id FROM discount_subscriptions
     WHERE discount_id IN (${placeholders})`,
    ids,
  );
  const [usageRows] = await pool.query(
    `SELECT discount_id, COUNT(*) AS usage_count, COALESCE(SUM(amount), 0) AS total_discount
     FROM discount_usages
     WHERE discount_id IN (${placeholders})
     GROUP BY discount_id`,
    ids,
  );

  const productsByDiscount = new Map();
  const subscriptionsByDiscount = new Map();
  const usageByDiscount = new Map();

  for (const row of productRows) {
    const list = productsByDiscount.get(row.discount_id) ?? [];
    list.push(row.product_id);
    productsByDiscount.set(row.discount_id, list);
  }

  for (const row of subscriptionRows) {
    const list = subscriptionsByDiscount.get(row.discount_id) ?? [];
    list.push(row.subscription_id);
    subscriptionsByDiscount.set(row.discount_id, list);
  }

  for (const row of usageRows) {
    usageByDiscount.set(row.discount_id, row);
  }

  return discounts.map((discount) => ({
    ...discount,
    product_ids: productsByDiscount.get(discount.id) ?? [],
    subscription_ids: subscriptionsByDiscount.get(discount.id) ?? [],
    usage_count: Number(usageByDiscount.get(discount.id)?.usage_count ?? 0),
    total_discount: usageByDiscount.get(discount.id)?.total_discount ?? '0.00',
  }));
}

export async function listDiscounts({
  search,
  status,
  discountType,
  page,
  limit,
  offset,
  sortBy,
  sortOrder,
}) {
  const conditions = ['1 = 1'];
  const parameters = [];

  if (search) {
    conditions.push('(d.name LIKE ? OR d.discount_type LIKE ?)');
    parameters.push(`%${search}%`, `%${search}%`);
  }

  if (status) {
    conditions.push('d.is_active = ?');
    parameters.push(status === 'ACTIVE' ? 1 : 0);
  }

  if (discountType) {
    conditions.push('d.discount_type = ?');
    parameters.push(discountType);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const allowedSort = {
    name: 'd.name',
    discount_type: 'd.discount_type',
    discount_value: 'd.discount_value',
    start_date: 'd.start_date',
    end_date: 'd.end_date',
    is_active: 'd.is_active',
    created_at: 'd.created_at',
  };
  const orderColumn = allowedSort[sortBy] ?? 'd.created_at';

  const [[countRow]] = await pool.query(
    `SELECT COUNT(*) AS total FROM discounts d ${where}`,
    parameters,
  );
  const [rows] = await pool.query(
    `SELECT d.*
     FROM discounts d
     ${where}
     ORDER BY ${orderColumn} ${sortOrder}
     LIMIT ? OFFSET ?`,
    [...parameters, limit, offset],
  );

  return {
    rows: await attachDiscountRelations(rows),
    total: countRow.total,
  };
}

export async function findDiscountById(id) {
  const [rows] = await pool.query(
    'SELECT * FROM discounts WHERE id = ? LIMIT 1',
    [id],
  );

  if (!rows[0]) {
    return null;
  }

  const [discount] = await attachDiscountRelations(rows);
  return discount;
}

export async function createDiscount(connection, discount, userId) {
  const [result] = await connection.query(
    `INSERT INTO discounts
      (name, discount_type, discount_value, minimum_purchase, minimum_quantity,
       start_date, end_date, maximum_usage, scope, is_active, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      discount.name,
      discount.discountType,
      discount.discountValue,
      discount.minimumPurchase,
      discount.minimumQuantity,
      discount.startDate,
      discount.endDate,
      discount.maximumUsage ?? null,
      discount.scope,
      discount.isActive ? 1 : 0,
      userId ?? null,
    ],
  );

  return result.insertId;
}

export async function updateDiscount(connection, discountId, discount) {
  const fieldMap = {
    name: 'name',
    discountType: 'discount_type',
    discountValue: 'discount_value',
    minimumPurchase: 'minimum_purchase',
    minimumQuantity: 'minimum_quantity',
    startDate: 'start_date',
    endDate: 'end_date',
    maximumUsage: 'maximum_usage',
    scope: 'scope',
    isActive: 'is_active',
  };
  const fields = [];
  const parameters = [];

  for (const [key, column] of Object.entries(fieldMap)) {
    if (discount[key] !== undefined) {
      fields.push(`${column} = ?`);
      parameters.push(
        key === 'isActive' ? (discount[key] ? 1 : 0) : discount[key],
      );
    }
  }

  if (fields.length === 0) {
    return;
  }

  parameters.push(discountId);
  await connection.query(
    `UPDATE discounts SET ${fields.join(', ')} WHERE id = ?`,
    parameters,
  );
}

export async function syncDiscountRelations(
  connection,
  discountId,
  { scope, productIds = [], subscriptionIds = [] },
) {
  await connection.query('DELETE FROM discount_products WHERE discount_id = ?', [
    discountId,
  ]);
  await connection.query(
    'DELETE FROM discount_subscriptions WHERE discount_id = ?',
    [discountId],
  );

  if (scope === 'PRODUCTS' && productIds.length > 0) {
    const values = productIds.map(() => '(?, ?)').join(', ');
    await connection.query(
      `INSERT INTO discount_products (discount_id, product_id) VALUES ${values}`,
      productIds.flatMap((productId) => [discountId, productId]),
    );
  }

  if (scope === 'SUBSCRIPTIONS' && subscriptionIds.length > 0) {
    const values = subscriptionIds.map(() => '(?, ?)').join(', ');
    await connection.query(
      `INSERT INTO discount_subscriptions (discount_id, subscription_id) VALUES ${values}`,
      subscriptionIds.flatMap((subscriptionId) => [discountId, subscriptionId]),
    );
  }
}

export async function discountUsageCount(discountId, connection = pool) {
  const [[row]] = await connection.query(
    'SELECT COUNT(*) AS total FROM discount_usages WHERE discount_id = ?',
    [discountId],
  );

  return Number(row.total);
}

export async function deleteDiscount(connection, discountId) {
  await connection.query('DELETE FROM discounts WHERE id = ?', [discountId]);
}

export async function findApplicableDiscount(
  connection,
  { subtotal, quantity, productIds, subscriptionId },
) {
  const today = todayString();
  const [candidates] = await connection.query(
    `SELECT d.*
     FROM discounts d
     WHERE d.is_active = 1
       AND d.start_date <= ?
       AND d.end_date >= ?
       AND d.minimum_purchase <= ?
       AND d.minimum_quantity <= ?
     ORDER BY d.id
     FOR UPDATE`,
    [today, today, subtotal, quantity],
  );

  const eligible = [];

  for (const discount of candidates) {
    if (discount.maximum_usage !== null) {
      const used = await discountUsageCount(discount.id, connection);
      if (used >= discount.maximum_usage) {
        continue;
      }
    }

    if (discount.scope === 'PRODUCTS') {
      const [productRows] = await connection.query(
        'SELECT product_id FROM discount_products WHERE discount_id = ?',
        [discount.id],
      );
      const applicableProducts = new Set(
        productRows.map((row) => String(row.product_id)),
      );
      if (!productIds.some((id) => applicableProducts.has(String(id)))) {
        continue;
      }
    }

    if (discount.scope === 'SUBSCRIPTIONS') {
      if (!subscriptionId) {
        continue;
      }

      const [subscriptionRows] = await connection.query(
        'SELECT subscription_id FROM discount_subscriptions WHERE discount_id = ?',
        [discount.id],
      );
      if (
        !subscriptionRows.some(
          (row) => String(row.subscription_id) === String(subscriptionId),
        )
      ) {
        continue;
      }
    }

    const amount =
      discount.discount_type === 'PERCENTAGE'
        ? Math.min(
            subtotal,
            Math.round(
              ((subtotal * Number(discount.discount_value)) / 100 +
                Number.EPSILON) *
                100,
            ) / 100,
          )
        : Math.min(subtotal, Number(discount.discount_value));

    eligible.push({
      discount,
      amount: Math.round((amount + Number.EPSILON) * 100) / 100,
    });
  }

  eligible.sort((first, second) => second.amount - first.amount);
  return eligible[0] ?? null;
}

export async function recordDiscountUsage(connection, usage) {
  await connection.query(
    `INSERT INTO discount_usages (discount_id, invoice_id, customer_id, amount)
     VALUES (?, ?, ?, ?)`,
    [usage.discountId, usage.invoiceId, usage.customerId, usage.amount],
  );
}
