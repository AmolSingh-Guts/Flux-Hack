import pool from '../config/database.js';

async function attachVariantsAndTaxes(products) {
  if (products.length === 0) {
    return products;
  }

  const productIds = products.map((product) => product.id);
  const placeholders = productIds.map(() => '?').join(', ');

  const [variantRows] = await pool.query(
    `SELECT * FROM product_variants
     WHERE product_id IN (${placeholders})
     ORDER BY name ASC`,
    productIds,
  );
  const [taxRows] = await pool.query(
    `SELECT pt.product_id, tr.id, tr.name, tr.percentage, tr.tax_type, tr.is_active
     FROM product_taxes pt
     INNER JOIN tax_rules tr ON tr.id = pt.tax_rule_id
     WHERE pt.product_id IN (${placeholders})
     ORDER BY tr.name ASC`,
    productIds,
  );

  const variantsByProduct = new Map();
  const taxesByProduct = new Map();

  for (const variant of variantRows) {
    const list = variantsByProduct.get(variant.product_id) ?? [];
    list.push(variant);
    variantsByProduct.set(variant.product_id, list);
  }

  for (const tax of taxRows) {
    const list = taxesByProduct.get(tax.product_id) ?? [];
    list.push(tax);
    taxesByProduct.set(tax.product_id, list);
  }

  return products.map((product) => ({
    ...product,
    variants: variantsByProduct.get(product.id) ?? [],
    taxes: taxesByProduct.get(product.id) ?? [],
  }));
}

export async function listProducts({
  search,
  status,
  productType,
  page,
  limit,
  offset,
  sortBy,
  sortOrder,
}) {
  const conditions = ['1 = 1'];
  const parameters = [];

  if (search) {
    conditions.push('(p.name LIKE ? OR p.product_type LIKE ? OR p.description LIKE ?)');
    parameters.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (status) {
    conditions.push('p.status = ?');
    parameters.push(status);
  }

  if (productType) {
    conditions.push('p.product_type = ?');
    parameters.push(productType);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const allowedSort = {
    name: 'p.name',
    product_type: 'p.product_type',
    sales_price: 'p.sales_price',
    cost_price: 'p.cost_price',
    status: 'p.status',
    created_at: 'p.created_at',
  };
  const orderColumn = allowedSort[sortBy] ?? 'p.created_at';

  const [[countRow]] = await pool.query(
    `SELECT COUNT(*) AS total FROM products p ${where}`,
    parameters,
  );
  const [rows] = await pool.query(
    `SELECT p.*,
       (SELECT COUNT(*) FROM product_variants pv WHERE pv.product_id = p.id) AS variant_count,
       (SELECT COUNT(*) FROM plans pl WHERE pl.product_id = p.id) AS plan_count
     FROM products p
     ${where}
     ORDER BY ${orderColumn} ${sortOrder}
     LIMIT ? OFFSET ?`,
    [...parameters, limit, offset],
  );

  return {
    rows: await attachVariantsAndTaxes(rows),
    total: countRow.total,
  };
}

export async function findProductById(id) {
  const [rows] = await pool.query(
    `SELECT p.*,
       (SELECT COUNT(*) FROM product_variants pv WHERE pv.product_id = p.id) AS variant_count,
       (SELECT COUNT(*) FROM plans pl WHERE pl.product_id = p.id) AS plan_count
     FROM products p
     WHERE p.id = ?
     LIMIT 1`,
    [id],
  );

  if (!rows[0]) {
    return null;
  }

  const [product] = await attachVariantsAndTaxes(rows);
  return product;
}

export async function createProduct(connection, product) {
  const [result] = await connection.query(
    `INSERT INTO products
      (name, product_type, sales_price, cost_price, description, notes, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      product.name,
      product.productType,
      product.salesPrice,
      product.costPrice,
      product.description ?? null,
      product.notes ?? null,
      product.status ?? 'ACTIVE',
    ],
  );

  return result.insertId;
}

export async function updateProduct(connection, productId, product) {
  const fieldMap = {
    name: 'name',
    productType: 'product_type',
    salesPrice: 'sales_price',
    costPrice: 'cost_price',
    description: 'description',
    notes: 'notes',
    status: 'status',
  };
  const fields = [];
  const parameters = [];

  for (const [key, column] of Object.entries(fieldMap)) {
    if (product[key] !== undefined) {
      fields.push(`${column} = ?`);
      parameters.push(product[key]);
    }
  }

  if (fields.length === 0) {
    return;
  }

  parameters.push(productId);
  await connection.query(
    `UPDATE products SET ${fields.join(', ')} WHERE id = ?`,
    parameters,
  );
}

export async function syncProductTaxes(connection, productId, taxRuleIds) {
  await connection.query('DELETE FROM product_taxes WHERE product_id = ?', [
    productId,
  ]);

  if (taxRuleIds.length === 0) {
    return;
  }

  const values = taxRuleIds.map(() => '(?, ?)').join(', ');
  const parameters = taxRuleIds.flatMap((taxRuleId) => [productId, taxRuleId]);
  await connection.query(
    `INSERT INTO product_taxes (product_id, tax_rule_id) VALUES ${values}`,
    parameters,
  );
}

export async function productDependencyCounts(productId, connection = pool) {
  const [rows] = await connection.query(
    `SELECT
      (SELECT COUNT(*) FROM plans WHERE product_id = ?) AS plans,
      (SELECT COUNT(*) FROM quotation_lines WHERE product_id = ?) AS quotationLines,
      (SELECT COUNT(*) FROM subscription_lines WHERE product_id = ?) AS subscriptionLines,
      (SELECT COUNT(*) FROM invoice_lines WHERE product_id = ?) AS invoiceLines`,
    [productId, productId, productId, productId],
  );

  return rows[0];
}

export async function deleteProduct(connection, productId) {
  await connection.query('DELETE FROM products WHERE id = ?', [productId]);
}

export async function listProductOptions(search = '') {
  const [rows] = await pool.query(
    `SELECT p.*
     FROM products p
     WHERE p.status = 'ACTIVE'
       AND (p.name LIKE ? OR p.product_type LIKE ?)
     ORDER BY p.name ASC
     LIMIT 100`,
    [`%${search}%`, `%${search}%`],
  );

  return attachVariantsAndTaxes(rows);
}

export async function listVariants({
  search,
  productId,
  page,
  limit,
  offset,
  sortBy,
  sortOrder,
}) {
  const conditions = ['1 = 1'];
  const parameters = [];

  if (search) {
    conditions.push('(pv.name LIKE ? OR pv.brand LIKE ? OR p.name LIKE ?)');
    parameters.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (productId) {
    conditions.push('pv.product_id = ?');
    parameters.push(productId);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const allowedSort = {
    name: 'pv.name',
    brand: 'pv.brand',
    additional_price: 'pv.additional_price',
    product_name: 'p.name',
    created_at: 'pv.created_at',
  };
  const orderColumn = allowedSort[sortBy] ?? 'pv.created_at';

  const [[countRow]] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM product_variants pv
     INNER JOIN products p ON p.id = pv.product_id
     ${where}`,
    parameters,
  );
  const [rows] = await pool.query(
    `SELECT pv.*, p.name AS product_name, p.sales_price AS product_sales_price
     FROM product_variants pv
     INNER JOIN products p ON p.id = pv.product_id
     ${where}
     ORDER BY ${orderColumn} ${sortOrder}
     LIMIT ? OFFSET ?`,
    [...parameters, limit, offset],
  );

  return { rows, total: countRow.total };
}

export async function findVariantById(id) {
  const [rows] = await pool.query(
    `SELECT pv.*, p.name AS product_name, p.sales_price AS product_sales_price
     FROM product_variants pv
     INNER JOIN products p ON p.id = pv.product_id
     WHERE pv.id = ?
     LIMIT 1`,
    [id],
  );

  return rows[0] ?? null;
}

export async function createVariant(connection, productId, variant) {
  const [result] = await connection.query(
    `INSERT INTO product_variants
      (product_id, name, brand, additional_price, is_active)
     VALUES (?, ?, ?, ?, ?)`,
    [
      productId,
      variant.name,
      variant.brand ?? null,
      variant.additionalPrice,
      variant.isActive === false ? 0 : 1,
    ],
  );

  return result.insertId;
}

export async function updateVariant(connection, variantId, variant) {
  const fieldMap = {
    name: 'name',
    brand: 'brand',
    additionalPrice: 'additional_price',
    isActive: 'is_active',
  };
  const fields = [];
  const parameters = [];

  for (const [key, column] of Object.entries(fieldMap)) {
    if (variant[key] !== undefined) {
      fields.push(`${column} = ?`);
      parameters.push(key === 'isActive' ? (variant[key] ? 1 : 0) : variant[key]);
    }
  }

  if (fields.length === 0) {
    return;
  }

  parameters.push(variantId);
  await connection.query(
    `UPDATE product_variants SET ${fields.join(', ')} WHERE id = ?`,
    parameters,
  );
}

export async function variantDependencyCounts(variantId, connection = pool) {
  const [rows] = await connection.query(
    `SELECT
      (SELECT COUNT(*) FROM quotation_lines WHERE variant_id = ?) AS quotationLines,
      (SELECT COUNT(*) FROM subscription_lines WHERE variant_id = ?) AS subscriptionLines,
      (SELECT COUNT(*) FROM invoice_lines WHERE variant_id = ?) AS invoiceLines`,
    [variantId, variantId, variantId],
  );

  return rows[0];
}

export async function deleteVariant(connection, variantId) {
  await connection.query('DELETE FROM product_variants WHERE id = ?', [
    variantId,
  ]);
}
