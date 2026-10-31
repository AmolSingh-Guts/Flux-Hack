import pool from '../config/database.js';

const allowedSort = {
  name: 'c.name',
  email: 'c.email',
  company_name: 'c.company_name',
  status: 'c.status',
  registration_date: 'c.registration_date',
  created_at: 'c.created_at',
};

export async function listCustomers({
  search,
  status,
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
      '(c.name LIKE ? OR c.email LIKE ? OR c.company_name LIKE ? OR c.phone LIKE ?)',
    );
    parameters.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (status) {
    conditions.push('c.status = ?');
    parameters.push(status);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const orderColumn = allowedSort[sortBy] ?? 'c.created_at';

  const [[countRow]] = await pool.query(
    `SELECT COUNT(*) AS total FROM customers c ${where}`,
    parameters,
  );
  const [rows] = await pool.query(
    `SELECT c.*,
       (SELECT COUNT(*) FROM subscriptions s WHERE s.customer_id = c.id) AS subscription_count,
       (SELECT COUNT(*) FROM invoices i WHERE i.customer_id = c.id) AS invoice_count,
       (SELECT COALESCE(SUM(i.balance_due), 0) FROM invoices i
         WHERE i.customer_id = c.id AND i.status IN ('CONFIRMED', 'PARTIALLY_PAID', 'OVERDUE')) AS outstanding_amount
     FROM customers c
     ${where}
     ORDER BY ${orderColumn} ${sortOrder}
     LIMIT ? OFFSET ?`,
    [...parameters, limit, offset],
  );

  return { rows, total: countRow.total };
}

export async function findCustomerById(id, connection = pool) {
  const [rows] = await connection.query(
    `SELECT c.*,
       (SELECT COUNT(*) FROM subscriptions s WHERE s.customer_id = c.id) AS subscription_count,
       (SELECT COUNT(*) FROM invoices i WHERE i.customer_id = c.id) AS invoice_count,
       (SELECT COALESCE(SUM(i.balance_due), 0) FROM invoices i
         WHERE i.customer_id = c.id AND i.status IN ('CONFIRMED', 'PARTIALLY_PAID', 'OVERDUE')) AS outstanding_amount
     FROM customers c
     WHERE c.id = ?
     LIMIT 1`,
    [id],
  );

  return rows[0] ?? null;
}

export async function findCustomerByEmail(email, connection = pool) {
  const [rows] = await connection.query(
    'SELECT * FROM customers WHERE email = ? LIMIT 1',
    [email],
  );

  return rows[0] ?? null;
}

export async function createCustomer(connection, customer) {
  const [result] = await connection.query(
    `INSERT INTO customers
      (name, email, phone, company_name, address, city, state, country, gst_number,
       registration_date, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      customer.name,
      customer.email,
      customer.phone ?? null,
      customer.companyName ?? null,
      customer.address ?? null,
      customer.city ?? null,
      customer.state ?? null,
      customer.country ?? 'India',
      customer.gstNumber ?? null,
      customer.registrationDate,
      customer.status ?? 'ACTIVE',
    ],
  );

  return result.insertId;
}

export async function updateCustomer(connection, customerId, customer) {
  const fieldMap = {
    name: 'name',
    email: 'email',
    phone: 'phone',
    companyName: 'company_name',
    address: 'address',
    city: 'city',
    state: 'state',
    country: 'country',
    gstNumber: 'gst_number',
    registrationDate: 'registration_date',
    status: 'status',
  };
  const fields = [];
  const parameters = [];

  for (const [key, column] of Object.entries(fieldMap)) {
    if (customer[key] !== undefined) {
      fields.push(`${column} = ?`);
      parameters.push(customer[key]);
    }
  }

  if (fields.length === 0) {
    return;
  }

  parameters.push(customerId);
  await connection.query(
    `UPDATE customers SET ${fields.join(', ')} WHERE id = ?`,
    parameters,
  );
}

export async function customerDependencyCounts(customerId, connection = pool) {
  const [rows] = await connection.query(
    `SELECT
      (SELECT COUNT(*) FROM subscriptions WHERE customer_id = ?) AS subscriptions,
      (SELECT COUNT(*) FROM invoices WHERE customer_id = ?) AS invoices,
      (SELECT COUNT(*) FROM quotations WHERE customer_id = ?) AS quotations,
      (SELECT COUNT(*) FROM payments WHERE customer_id = ?) AS payments,
      (SELECT COUNT(*) FROM users WHERE customer_id = ?) AS portalUsers`,
    [customerId, customerId, customerId, customerId, customerId],
  );

  return rows[0];
}

export async function archiveCustomer(connection, customerId) {
  await connection.query(
    "UPDATE customers SET status = 'ARCHIVED' WHERE id = ?",
    [customerId],
  );
}

export async function deleteCustomer(connection, customerId) {
  await connection.query('DELETE FROM customers WHERE id = ?', [customerId]);
}

export async function findCustomerForUser(userId) {
  const [rows] = await pool.query(
    `SELECT c.*
     FROM users u
     INNER JOIN customers c ON c.id = u.customer_id
     WHERE u.id = ?
     LIMIT 1`,
    [userId],
  );

  return rows[0] ?? null;
}

export async function updateCustomerProfile(customerId, profile) {
  const allowed = ['name', 'phone', 'company_name', 'address', 'city', 'state', 'country', 'gst_number'];
  const fields = [];
  const parameters = [];

  for (const [key, column] of Object.entries({
    name: 'name',
    phone: 'phone',
    companyName: 'company_name',
    address: 'address',
    city: 'city',
    state: 'state',
    country: 'country',
    gstNumber: 'gst_number',
  })) {
    if (profile[key] !== undefined && allowed.includes(column)) {
      fields.push(`${column} = ?`);
      parameters.push(profile[key]);
    }
  }

  if (fields.length === 0) {
    return;
  }

  parameters.push(customerId);
  await pool.query(
    `UPDATE customers SET ${fields.join(', ')} WHERE id = ?`,
    parameters,
  );
}

export async function listCustomersForSelect(search = '') {
  const [rows] = await pool.query(
    `SELECT id, name, email, company_name, status
     FROM customers
     WHERE status != 'ARCHIVED'
       AND (name LIKE ? OR email LIKE ? OR company_name LIKE ?)
     ORDER BY name ASC
     LIMIT 50`,
    [`%${search}%`, `%${search}%`, `%${search}%`],
  );

  return rows;
}
