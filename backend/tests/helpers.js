import request from 'supertest';
import app from '../src/app.js';
import pool from '../src/config/database.js';
import { seedDatabase } from '../database/seed.js';

const DEMO_PASSWORDS = {
  ADMIN: 'Admin@1234',
  STAFF: 'Staff@1234',
  CUSTOMER: 'Customer@1234',
};

const DEMO_EMAILS = {
  ADMIN: 'admin@brightloop.test',
  STAFF: 'staff@brightloop.test',
  CUSTOMER: 'customer@brightloop.test',
};

export function api() {
  return request(app);
}

/**
 * Rebuild the dedicated test database from the demo seed so each suite starts
 * from a known, realistic state. NODE_ENV=test forces the test database name.
 */
export async function resetDatabase() {
  const originalLog = console.log;
  console.log = () => {};
  try {
    await seedDatabase({ force: true });
  } finally {
    console.log = originalLog;
  }
}

export async function closeDatabase() {
  await pool.end();
}

export async function login(email, password) {
  const response = await api()
    .post('/api/auth/login')
    .send({ email, password });

  if (response.status !== 200) {
    throw new Error(
      `Login failed for ${email}: ${response.status} ${JSON.stringify(response.body)}`,
    );
  }

  return response.body.data.token;
}

export async function loginAs(role) {
  return login(DEMO_EMAILS[role], DEMO_PASSWORDS[role]);
}

export function bearer(token) {
  return { Authorization: `Bearer ${token}` };
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function addMonths(dateString, months) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  const originalDay = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  date.setUTCDate(Math.min(originalDay, lastDay));
  return date.toISOString().slice(0, 10);
}

export function query(sql, parameters = []) {
  return pool.query(sql, parameters);
}

export async function firstRow(sql, parameters = []) {
  const [rows] = await pool.query(sql, parameters);
  return rows[0] ?? null;
}

/**
 * Create a product + plan pair through the real API so pricing, tax links, and
 * plan price history are exercised exactly like the UI does.
 */
export async function createProductAndPlan(token, {
  name = 'Test Suite Product',
  taxPercentage = 10,
  price = 1000,
} = {}) {
  const taxResponse = await api()
    .post('/api/taxes')
    .set(bearer(token))
    .send({
      name: `${name} Tax ${taxPercentage}%`,
      percentage: taxPercentage,
      taxType: 'GST',
      isActive: true,
    });

  if (taxResponse.status !== 201) {
    throw new Error(`Tax creation failed: ${JSON.stringify(taxResponse.body)}`);
  }

  const productResponse = await api()
    .post('/api/products')
    .set(bearer(token))
    .send({
      name,
      productType: 'Software',
      salesPrice: price,
      costPrice: 100,
      status: 'ACTIVE',
      taxRuleIds: [taxResponse.body.data.id],
    });

  if (productResponse.status !== 201) {
    throw new Error(`Product creation failed: ${JSON.stringify(productResponse.body)}`);
  }

  const planResponse = await api()
    .post('/api/plans')
    .set(bearer(token))
    .send({
      name: `${name} Monthly`,
      productId: productResponse.body.data.id,
      billingFrequency: 'MONTHLY',
      price,
      minQuantity: 1,
      startDate: addDays(-30),
      status: 'ACTIVE',
    });

  if (planResponse.status !== 201) {
    throw new Error(`Plan creation failed: ${JSON.stringify(planResponse.body)}`);
  }

  return {
    tax: taxResponse.body.data,
    product: productResponse.body.data,
    plan: planResponse.body.data,
  };
}

export async function createCustomer(token, overrides = {}) {
  const unique = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const response = await api()
    .post('/api/customers')
    .set(bearer(token))
    .send({
      name: `Test Customer ${unique}`,
      email: `customer-${unique}@example.test`,
      phone: '+91 90000 20000',
      companyName: 'Test Co',
      status: 'ACTIVE',
      ...overrides,
    });

  if (response.status !== 201) {
    throw new Error(`Customer creation failed: ${JSON.stringify(response.body)}`);
  }

  return response.body.data;
}
