import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import {
  api,
  bearer,
  closeDatabase,
  firstRow,
  login,
  loginAs,
  resetDatabase,
} from './helpers.js';

let adminToken;
let staffToken;
let customerToken;
let demoCustomerId;

before(async () => {
  await resetDatabase();
  adminToken = await loginAs('ADMIN');
  staffToken = await loginAs('STAFF');
  customerToken = await loginAs('CUSTOMER');
  const demoCustomer = await firstRow(
    'SELECT id FROM customers WHERE email = ? LIMIT 1',
    ['customer@brightloop.test'],
  );
  demoCustomerId = demoCustomer.id;
});

after(async () => {
  await closeDatabase();
});

describe('Authentication', () => {
  test('health endpoint reports a live service', async () => {
    const response = await api().get('/api/health');

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.service, 'brightloop-api');
  });

  test('login returns a token and public user for each role', async () => {
    for (const role of ['ADMIN', 'STAFF', 'CUSTOMER']) {
      const token = await loginAs(role);
      assert.equal(typeof token, 'string');
      assert.ok(token.length > 20);
    }
  });

  test('login rejects an invalid password', async () => {
    const response = await api()
      .post('/api/auth/login')
      .send({ email: 'admin@brightloop.test', password: 'Wrong@1234' });

    assert.equal(response.status, 401);
    assert.equal(response.body.success, false);
  });

  test('login validates the request body', async () => {
    const response = await api()
      .post('/api/auth/login')
      .send({ email: 'not-an-email' });

    assert.equal(response.status, 422);
    assert.equal(response.body.success, false);
  });

  test('me returns the authenticated user without the password hash', async () => {
    const response = await api()
      .get('/api/auth/me')
      .set(bearer(adminToken));

    assert.equal(response.status, 200);
    assert.equal(response.body.data.email, 'admin@brightloop.test');
    assert.equal(response.body.data.role, 'ADMIN');
    assert.equal(response.body.data.password_hash, undefined);
  });

  test('protected endpoints reject missing and malformed tokens', async () => {
    const missing = await api().get('/api/customers');
    assert.equal(missing.status, 401);

    const malformed = await api()
      .get('/api/customers')
      .set({ Authorization: 'Bearer not-a-real-token' });
    assert.equal(malformed.status, 401);
  });

  test('self-service profile update changes the account name', async () => {
    const response = await api()
      .patch('/api/auth/profile')
      .set(bearer(adminToken))
      .send({ name: 'Riya Desai Updated' });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.name, 'Riya Desai Updated');

    const me = await api().get('/api/auth/me').set(bearer(adminToken));
    assert.equal(me.body.data.name, 'Riya Desai Updated');
  });

  test('self-service profile update rejects a duplicate email', async () => {
    const response = await api()
      .patch('/api/auth/profile')
      .set(bearer(adminToken))
      .send({ email: 'staff@brightloop.test' });

    assert.equal(response.status, 409);
  });

  test('password change requires the current password and the new password works', async () => {
    const wrong = await api()
      .patch('/api/auth/change-password')
      .set(bearer(staffToken))
      .send({ currentPassword: 'NotThePassword@1', newPassword: 'StaffNew@1234' });

    assert.equal(wrong.status, 400);

    const changed = await api()
      .patch('/api/auth/change-password')
      .set(bearer(staffToken))
      .send({ currentPassword: 'Staff@1234', newPassword: 'StaffNew@1234' });

    assert.equal(changed.status, 200);

    const token = await login('staff@brightloop.test', 'StaffNew@1234');
    assert.equal(typeof token, 'string');

    const restored = await api()
      .patch('/api/auth/change-password')
      .set(bearer(token))
      .send({ currentPassword: 'StaffNew@1234', newPassword: 'Staff@1234' });

    assert.equal(restored.status, 200);
  });

  test('registration creates a customer portal account', async () => {
    const email = `signup-${Date.now()}@example.test`;
    const response = await api().post('/api/auth/register').send({
      name: 'Signup Tester',
      email,
      password: 'Signup@1234',
      companyName: 'Signup Co',
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.data.user.role, 'CUSTOMER');
    assert.ok(response.body.data.user.customerId);

    const token = await login(email, 'Signup@1234');
    const portal = await api()
      .get('/api/portal/profile')
      .set(bearer(token));

    assert.equal(portal.status, 200);
    assert.equal(portal.body.data.account.email, email);
  });
});

describe('Role-based access control', () => {
  test('customers cannot reach staff or admin endpoints', async () => {
    const customers = await api()
      .get('/api/customers')
      .set(bearer(customerToken));
    assert.equal(customers.status, 403);

    const dashboard = await api()
      .get('/api/dashboard/admin')
      .set(bearer(customerToken));
    assert.equal(dashboard.status, 403);

    const products = await api()
      .get('/api/products')
      .set(bearer(customerToken));
    assert.equal(products.status, 403);
  });

  test('staff cannot manage staff, products, plans, taxes, discounts, reports, or settings', async () => {
    const checks = [
      ['get', '/api/staff'],
      ['post', '/api/products'],
      ['post', '/api/plans'],
      ['get', '/api/taxes'],
      ['get', '/api/discounts'],
      ['get', '/api/reports'],
      ['get', '/api/settings'],
      ['get', '/api/billing/logs'],
    ];

    for (const [method, path] of checks) {
      const response = await api()[method](path)
        .set(bearer(staffToken))
        .send({});

      assert.equal(
        response.status,
        403,
        `${method.toUpperCase()} ${path} should be admin-only for staff`,
      );
    }
  });

  test('staff can use modules covered by their permissions', async () => {
    const customers = await api()
      .get('/api/customers')
      .set(bearer(staffToken));
    assert.equal(customers.status, 200);

    const invoices = await api()
      .get('/api/invoices')
      .set(bearer(staffToken));
    assert.equal(invoices.status, 200);

    const dashboard = await api()
      .get('/api/dashboard/staff')
      .set(bearer(staffToken));
    assert.equal(dashboard.status, 200);
  });

  test('admin can create a staff user with limited permissions', async () => {
    const email = `limited-staff-${Date.now()}@brightloop.test`;
    const created = await api()
      .post('/api/staff')
      .set(bearer(adminToken))
      .send({
        name: 'Limited Staff',
        email,
        password: 'Limited@1234',
        permissions: ['customers'],
        isActive: true,
      });

    assert.equal(created.status, 201);
    assert.deepEqual(created.body.data.permissions, ['customers']);

    const token = await login(email, 'Limited@1234');

    const customers = await api()
      .get('/api/customers')
      .set(bearer(token));
    assert.equal(customers.status, 200);

    const invoices = await api()
      .get('/api/invoices')
      .set(bearer(token));
    assert.equal(invoices.status, 403);

    const updated = await api()
      .patch(`/api/staff/${created.body.data.id}`)
      .set(bearer(adminToken))
      .send({ permissions: ['customers', 'invoices'] });

    assert.equal(updated.status, 200);
    assert.deepEqual(updated.body.data.permissions, ['customers', 'invoices']);

    const invoicesNow = await api()
      .get('/api/invoices')
      .set(bearer(token));
    assert.equal(invoicesNow.status, 200);
  });

  test('an inactive staff account can no longer sign in', async () => {
    const email = `inactive-staff-${Date.now()}@brightloop.test`;
    const created = await api()
      .post('/api/staff')
      .set(bearer(adminToken))
      .send({
        name: 'Inactive Staff',
        email,
        password: 'Inactive@1234',
        permissions: ['customers'],
        isActive: true,
      });

    assert.equal(created.status, 201);

    const deactivated = await api()
      .patch(`/api/staff/${created.body.data.id}`)
      .set(bearer(adminToken))
      .send({ isActive: false });

    assert.equal(deactivated.status, 200);

    const response = await api()
      .post('/api/auth/login')
      .send({ email, password: 'Inactive@1234' });

    assert.equal(response.status, 401);
  });
});

describe('Customer data isolation', () => {
  test('a customer cannot read another customer invoice or subscription', async () => {
    const foreignInvoice = await firstRow(
      `SELECT id FROM invoices WHERE customer_id <> ? ORDER BY id LIMIT 1`,
      [demoCustomerId],
    );
    const foreignSubscription = await firstRow(
      `SELECT id FROM subscriptions WHERE customer_id <> ? ORDER BY id LIMIT 1`,
      [demoCustomerId],
    );

    assert.ok(foreignInvoice, 'seed should include an invoice for another customer');
    assert.ok(
      foreignSubscription,
      'seed should include a subscription for another customer',
    );

    const invoice = await api()
      .get(`/api/portal/invoices/${foreignInvoice.id}`)
      .set(bearer(customerToken));
    assert.equal(invoice.status, 404);

    const invoicePdf = await api()
      .get(`/api/portal/invoices/${foreignInvoice.id}/pdf`)
      .set(bearer(customerToken));
    assert.equal(invoicePdf.status, 404);

    const subscription = await api()
      .get(`/api/portal/subscriptions/${foreignSubscription.id}`)
      .set(bearer(customerToken));
    assert.equal(subscription.status, 404);
  });

  test('a customer can read their own invoices and subscriptions', async () => {
    const ownInvoice = await firstRow(
      `SELECT id FROM invoices WHERE customer_id = ? ORDER BY id LIMIT 1`,
      [demoCustomerId],
    );
    const ownSubscription = await firstRow(
      `SELECT id FROM subscriptions WHERE customer_id = ? ORDER BY id LIMIT 1`,
      [demoCustomerId],
    );

    const invoice = await api()
      .get(`/api/portal/invoices/${ownInvoice.id}`)
      .set(bearer(customerToken));
    assert.equal(invoice.status, 200);

    const subscription = await api()
      .get(`/api/portal/subscriptions/${ownSubscription.id}`)
      .set(bearer(customerToken));
    assert.equal(subscription.status, 200);
  });

  test('customer portal profile updates sync the linked user name', async () => {
    const response = await api()
      .patch('/api/portal/profile')
      .set(bearer(customerToken))
      .send({ name: 'Aarav Mehta Portal' });

    assert.equal(response.status, 200);

    const me = await api()
      .get('/api/auth/me')
      .set(bearer(customerToken));
    assert.equal(me.body.data.name, 'Aarav Mehta Portal');

    const customer = await firstRow(
      'SELECT name, company_name FROM customers WHERE email = ? LIMIT 1',
      ['customer@brightloop.test'],
    );
    assert.equal(customer.name, 'Aarav Mehta Portal');
    assert.equal(customer.company_name, 'Northstar Analytics');

    await api()
      .patch('/api/portal/profile')
      .set(bearer(customerToken))
      .send({ name: 'Aarav Mehta' });
  });

  test('customers cannot read admin invoice lists', async () => {
    const response = await api()
      .get('/api/invoices')
      .set(bearer(customerToken));
    assert.equal(response.status, 403);
  });
});
