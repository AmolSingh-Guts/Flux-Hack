import pool from '../config/database.js';

export async function getCompanySettings(connection = pool) {
  const [rows] = await connection.query(
    'SELECT * FROM company_settings WHERE id = 1 LIMIT 1',
  );

  return rows[0] ?? null;
}

export async function updateCompanySettings(connection, settings) {
  const fieldMap = {
    companyName: 'company_name',
    email: 'email',
    phone: 'phone',
    address: 'address',
    city: 'city',
    state: 'state',
    country: 'country',
    gstNumber: 'gst_number',
    currency: 'currency',
    invoicePrefix: 'invoice_prefix',
    quotationPrefix: 'quotation_prefix',
    subscriptionPrefix: 'subscription_prefix',
    paymentPrefix: 'payment_prefix',
    invoiceFooter: 'invoice_footer',
  };
  const fields = [];
  const parameters = [];

  for (const [key, column] of Object.entries(fieldMap)) {
    if (settings[key] !== undefined) {
      fields.push(`${column} = ?`);
      parameters.push(settings[key]);
    }
  }

  if (fields.length === 0) {
    return;
  }

  await connection.query(
    `UPDATE company_settings SET ${fields.join(', ')} WHERE id = 1`,
    parameters,
  );
}
