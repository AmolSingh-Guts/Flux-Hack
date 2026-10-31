import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import {
  addDays,
  addMonths,
  api,
  bearer,
  closeDatabase,
  createCustomer,
  createProductAndPlan,
  firstRow,
  loginAs,
  query,
  resetDatabase,
  today,
} from './helpers.js';

let adminToken;
let resources;
let customer;
let quotation;
let subscription;
let firstInvoice;

before(async () => {
  await resetDatabase();
  // Keep the workflow deterministic: demo discounts stay visible in the admin
  // UI but are deactivated so only discounts created by this suite can apply.
  await query('UPDATE discounts SET is_active = 0');
  adminToken = await loginAs('ADMIN');
  resources = await createProductAndPlan(adminToken, {
    name: 'Workflow Suite',
    taxPercentage: 10,
    price: 1000,
  });
  customer = await createCustomer(adminToken, {
    name: 'Workflow Customer',
    companyName: 'Workflow Co',
  });
});

after(async () => {
  await closeDatabase();
});

describe('Products, variants, taxes, and plans', () => {
  test('a product created through the API exposes its tax link and can hold variants', async () => {
    const show = await api()
      .get(`/api/products/${resources.product.id}`)
      .set(bearer(adminToken));

    assert.equal(show.status, 200);
    assert.equal(show.body.data.name, 'Workflow Suite');
    assert.equal(Number(show.body.data.sales_price), 1000);
    assert.ok(
      show.body.data.taxes.some((tax) => tax.id === resources.tax.id),
      'product should be linked to the created tax rule',
    );

    const variant = await api()
      .post(`/api/products/${resources.product.id}/variants`)
      .set(bearer(adminToken))
      .send({
        name: 'Pro Variant',
        brand: 'Brightloop',
        additionalPrice: 250,
        isActive: true,
      });

    assert.equal(variant.status, 201);
    assert.equal(Number(variant.body.data.additional_price), 250);

    const list = await api()
      .get(`/api/products/${resources.product.id}`)
      .set(bearer(adminToken));
    assert.ok(list.body.data.variants.some((row) => row.id === variant.body.data.id));
  });

  test('a plan stores its price history and appears in the plan list', async () => {
    const show = await api()
      .get(`/api/plans/${resources.plan.id}`)
      .set(bearer(adminToken));

    assert.equal(show.status, 200);
    assert.equal(show.body.data.billing_frequency, 'MONTHLY');
    assert.equal(Number(show.body.data.price), 1000);

    const list = await api()
      .get('/api/plans?limit=100')
      .set(bearer(adminToken));

    assert.equal(list.status, 200);
    assert.ok(list.body.data.some((plan) => plan.id === resources.plan.id));
  });
});

describe('Quotation to subscription conversion', () => {
  test('a draft quotation prices lines with product tax', async () => {
    const response = await api()
      .post('/api/quotations')
      .set(bearer(adminToken))
      .send({
        customerId: customer.id,
        validityDays: 30,
        lines: [
          {
            productId: resources.product.id,
            planId: resources.plan.id,
            quantity: 1,
          },
        ],
      });

    assert.equal(response.status, 201);
    quotation = response.body.data;
    assert.equal(quotation.status, 'DRAFT');
    assert.equal(Number(quotation.subtotal), 1000);
    assert.equal(Number(quotation.tax_amount), 100);
    assert.equal(Number(quotation.total_amount), 1100);
  });

  test('a draft quotation cannot be converted before it is accepted', async () => {
    const response = await api()
      .post(`/api/quotations/${quotation.id}/convert`)
      .set(bearer(adminToken))
      .send({});

    assert.equal(response.status, 400);
  });

  test('accepting a quotation enables conversion into a confirmed subscription', async () => {
    const sent = await api()
      .patch(`/api/quotations/${quotation.id}/status`)
      .set(bearer(adminToken))
      .send({ status: 'SENT' });
    assert.equal(sent.status, 200);

    const accepted = await api()
      .patch(`/api/quotations/${quotation.id}/status`)
      .set(bearer(adminToken))
      .send({ status: 'ACCEPTED' });
    assert.equal(accepted.status, 200);
    assert.equal(accepted.body.data.status, 'ACCEPTED');

    const converted = await api()
      .post(`/api/quotations/${quotation.id}/convert`)
      .set(bearer(adminToken))
      .send({ startDate: today(), paymentTermsDays: 30 });

    assert.equal(converted.status, 201);
    subscription = converted.body.data.subscription;
    assert.equal(subscription.status, 'CONFIRMED');
    assert.equal(subscription.quotation_id, quotation.id);
    assert.equal(Number(subscription.total_amount), 1100);
    assert.ok(subscription.lines.length > 0);

    const quotationAfter = await api()
      .get(`/api/quotations/${quotation.id}`)
      .set(bearer(adminToken));
    assert.equal(quotationAfter.body.data.subscription_id, subscription.id);
  });

  test('a quotation cannot be converted twice', async () => {
    const response = await api()
      .post(`/api/quotations/${quotation.id}/convert`)
      .set(bearer(adminToken))
      .send({});

    assert.equal(response.status, 409);
  });
});

describe('Subscription lifecycle', () => {
  test('a subscription can be paused, resumed, and closed', async () => {
    const created = await api()
      .post('/api/subscriptions')
      .set(bearer(adminToken))
      .send({
        customerId: customer.id,
        planId: resources.plan.id,
        startDate: today(),
        paymentTermsDays: 30,
        status: 'ACTIVE',
        lines: [
          {
            productId: resources.product.id,
            planId: resources.plan.id,
            quantity: 1,
          },
        ],
      });

    assert.equal(created.status, 201);
    const lifecycle = created.body.data;
    assert.equal(lifecycle.status, 'ACTIVE');

    const paused = await api()
      .post(`/api/subscriptions/${lifecycle.id}/pause`)
      .set(bearer(adminToken));
    assert.equal(paused.status, 200);
    assert.equal(paused.body.data.status, 'PAUSED');

    const invoiceWhilePaused = await api()
      .post(`/api/subscriptions/${lifecycle.id}/invoices`)
      .set(bearer(adminToken))
      .send({});
    assert.equal(invoiceWhilePaused.status, 400);

    const resumed = await api()
      .post(`/api/subscriptions/${lifecycle.id}/resume`)
      .set(bearer(adminToken));
    assert.equal(resumed.status, 200);
    assert.equal(resumed.body.data.status, 'ACTIVE');

    const closed = await api()
      .post(`/api/subscriptions/${lifecycle.id}/close`)
      .set(bearer(adminToken))
      .send({ reason: 'Workflow test closure' });
    assert.equal(closed.status, 200);
    assert.equal(closed.body.data.status, 'CLOSED');
    assert.equal(closed.body.data.next_billing_date, null);

    const pauseAfterClose = await api()
      .post(`/api/subscriptions/${lifecycle.id}/pause`)
      .set(bearer(adminToken));
    assert.equal(pauseAfterClose.status, 400);

    const history = await api()
      .get(`/api/subscriptions/${lifecycle.id}`)
      .set(bearer(adminToken));
    const actions = history.body.data.history.map((entry) => entry.action);
    assert.ok(actions.includes('PAUSED'));
    assert.ok(actions.includes('RESUMED'));
    assert.ok(actions.includes('CLOSED'));
  });
});

describe('Invoice generation and duplicate prevention', () => {
  test('activating the converted subscription allows billing', async () => {
    const activated = await api()
      .post(`/api/subscriptions/${subscription.id}/activate`)
      .set(bearer(adminToken));

    assert.equal(activated.status, 200);
    assert.equal(activated.body.data.status, 'ACTIVE');
  });

  test('generating an invoice advances the next billing date', async () => {
    const response = await api()
      .post(`/api/subscriptions/${subscription.id}/invoices`)
      .set(bearer(adminToken))
      .send({});

    assert.equal(response.status, 201);
    firstInvoice = response.body.data;

    const invoice = await api()
      .get(`/api/invoices/${firstInvoice.invoiceId}`)
      .set(bearer(adminToken));

    assert.equal(invoice.status, 200);
    assert.equal(invoice.body.data.status, 'CONFIRMED');
    assert.equal(Number(invoice.body.data.total_amount), 1100);
    assert.equal(invoice.body.data.billing_period_start, today());

    const subscriptionAfter = await api()
      .get(`/api/subscriptions/${subscription.id}`)
      .set(bearer(adminToken));

    assert.equal(
      subscriptionAfter.body.data.next_billing_date,
      addMonths(today(), 1),
    );
  });

  test('the same billing period cannot be invoiced twice', async () => {
    const response = await api()
      .post(`/api/subscriptions/${subscription.id}/invoices`)
      .set(bearer(adminToken))
      .send({ billingPeriodStart: today() });

    assert.equal(response.status, 409);
    assert.match(response.body.message, /already exists/i);
  });

  test('an invoice PDF can be downloaded', async () => {
    const response = await api()
      .get(`/api/invoices/${firstInvoice.invoiceId}/pdf`)
      .set(bearer(adminToken));

    assert.equal(response.status, 200);
    assert.match(response.headers['content-type'], /application\/pdf/);
    assert.ok(response.body.length > 500);
  });
});

describe('Discounts, taxes, and partial payments', () => {
  let discount;
  let discountedInvoice;
  let firstPayment;

  test('a percentage discount is applied to a confirmed manual invoice', async () => {
    const discountResponse = await api()
      .post('/api/discounts')
      .set(bearer(adminToken))
      .send({
        name: 'Workflow 10% Off',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        minimumPurchase: 0,
        minimumQuantity: 1,
        startDate: addDays(-1),
        endDate: addDays(30),
        maximumUsage: 10,
        scope: 'ALL',
        isActive: true,
        productIds: [],
        subscriptionIds: [],
      });

    assert.equal(discountResponse.status, 201);
    discount = discountResponse.body.data;

    const invoiceResponse = await api()
      .post('/api/invoices')
      .set(bearer(adminToken))
      .send({
        customerId: customer.id,
        status: 'CONFIRMED',
        applyDiscount: true,
        lines: [
          {
            productId: resources.product.id,
            quantity: 1,
          },
        ],
      });

    assert.equal(invoiceResponse.status, 201);
    discountedInvoice = invoiceResponse.body.data;
    assert.equal(Number(discountedInvoice.subtotal), 1000);
    assert.equal(Number(discountedInvoice.discount_amount), 100);
    assert.equal(Number(discountedInvoice.tax_amount), 100);
    assert.equal(Number(discountedInvoice.total_amount), 1000);
    assert.equal(discountedInvoice.discount_id, discount.id);
  });

  test('a partial payment updates the invoice to PARTIALLY_PAID', async () => {
    const response = await api()
      .post('/api/payments')
      .set(bearer(adminToken))
      .send({
        invoiceId: discountedInvoice.id,
        paymentMethod: 'BANK_TRANSFER',
        amount: 400,
        transactionReference: 'BANK-REF-1001',
        notes: 'First instalment',
      });

    assert.equal(response.status, 201);
    firstPayment = response.body.data;
    assert.equal(firstPayment.status, 'COMPLETED');

    const invoice = await api()
      .get(`/api/invoices/${discountedInvoice.id}`)
      .set(bearer(adminToken));

    assert.equal(invoice.body.data.status, 'PARTIALLY_PAID');
    assert.equal(Number(invoice.body.data.amount_paid), 400);
    assert.equal(Number(invoice.body.data.balance_due), 600);
  });

  test('payments above the outstanding balance are rejected', async () => {
    const response = await api()
      .post('/api/payments')
      .set(bearer(adminToken))
      .send({
        invoiceId: discountedInvoice.id,
        paymentMethod: 'CASH',
        amount: 700,
      });

    assert.equal(response.status, 400);
    assert.match(response.body.message, /exceeds/i);
  });

  test('online payment methods require a transaction reference', async () => {
    const response = await api()
      .post('/api/payments')
      .set(bearer(adminToken))
      .send({
        invoiceId: discountedInvoice.id,
        paymentMethod: 'UPI',
        amount: 100,
      });

    assert.equal(response.status, 400);
    assert.match(response.body.message, /reference/i);
  });

  test('the remaining balance marks the invoice PAID', async () => {
    const response = await api()
      .post('/api/payments')
      .set(bearer(adminToken))
      .send({
        invoiceId: discountedInvoice.id,
        paymentMethod: 'UPI',
        amount: 600,
        transactionReference: 'UPI-REF-2002',
      });

    assert.equal(response.status, 201);

    const invoice = await api()
      .get(`/api/invoices/${discountedInvoice.id}`)
      .set(bearer(adminToken));

    assert.equal(invoice.body.data.status, 'PAID');
    assert.equal(Number(invoice.body.data.balance_due), 0);
  });

  test('voiding a payment restores the outstanding balance', async () => {
    const payment = await firstRow(
      `SELECT id FROM payments WHERE invoice_id = ? AND status = 'COMPLETED'
       ORDER BY id DESC LIMIT 1`,
      [discountedInvoice.id],
    );

    const response = await api()
      .post(`/api/payments/${payment.id}/void`)
      .set(bearer(adminToken));

    assert.equal(response.status, 200);
    assert.equal(response.body.data.status, 'VOID');

    const invoice = await api()
      .get(`/api/invoices/${discountedInvoice.id}`)
      .set(bearer(adminToken));

    assert.equal(invoice.body.data.status, 'PARTIALLY_PAID');
    assert.equal(Number(invoice.body.data.balance_due), 600);
  });

  test('tax and discount records can be updated and deactivated', async () => {
    const taxUpdate = await api()
      .patch(`/api/taxes/${resources.tax.id}`)
      .set(bearer(adminToken))
      .send({ percentage: 12 });
    assert.equal(taxUpdate.status, 200);
    assert.equal(Number(taxUpdate.body.data.percentage), 12);

    const discountUpdate = await api()
      .patch(`/api/discounts/${discount.id}`)
      .set(bearer(adminToken))
      .send({ isActive: false });
    assert.equal(discountUpdate.status, 200);
    assert.equal(Boolean(discountUpdate.body.data.is_active), false);
  });
});

describe('Recurring billing', () => {
  test('the billing run generates an invoice for a due subscription and logs it', async () => {
    const periodStart = addDays(-1);
    await query(
      'UPDATE subscriptions SET next_billing_date = ? WHERE id = ?',
      [periodStart, subscription.id],
    );

    const run = await api()
      .post('/api/billing/run')
      .set(bearer(adminToken))
      .send({ date: today() });

    assert.equal(run.status, 200);
    const summary = run.body.data;
    const generated = summary.generated.find(
      (entry) => entry.subscriptionId === subscription.id,
    );

    assert.ok(generated, 'billing run should include the due subscription');
    assert.ok(generated.invoiceNumber);

    const invoice = await firstRow(
      `SELECT * FROM invoices WHERE subscription_id = ? AND billing_period_start = ?`,
      [subscription.id, periodStart],
    );
    assert.ok(invoice);
    assert.equal(Number(invoice.total_amount), 1100);

    const subscriptionAfter = await api()
      .get(`/api/subscriptions/${subscription.id}`)
      .set(bearer(adminToken));
    assert.equal(
      subscriptionAfter.body.data.next_billing_date,
      addMonths(periodStart, 1),
    );

    const logs = await api()
      .get(`/api/billing/logs?subscriptionId=${subscription.id}&limit=50`)
      .set(bearer(adminToken));

    assert.equal(logs.status, 200);
    assert.ok(logs.body.data.some((entry) => entry.status === 'SUCCESS'));
  });

  test('billing never bills a closed subscription', async () => {
    const closed = await api()
      .post('/api/subscriptions')
      .set(bearer(adminToken))
      .send({
        customerId: customer.id,
        planId: resources.plan.id,
        startDate: addDays(-10),
        status: 'DRAFT',
        lines: [
          {
            productId: resources.product.id,
            planId: resources.plan.id,
            quantity: 1,
          },
        ],
      });

    assert.equal(closed.status, 201);

    await api()
      .post(`/api/subscriptions/${closed.body.data.id}/close`)
      .set(bearer(adminToken))
      .send({ reason: 'Never billed' });

    await query(
      'UPDATE subscriptions SET next_billing_date = ? WHERE id = ?',
      [addDays(-1), closed.body.data.id],
    );

    const run = await api()
      .post('/api/billing/run')
      .set(bearer(adminToken))
      .send({ date: today() });

    assert.equal(run.status, 200);
    assert.ok(
      !run.body.data.generated.some(
        (entry) => entry.subscriptionId === closed.body.data.id,
      ),
      'closed subscriptions must not be billed',
    );

    const invoices = await firstRow(
      'SELECT COUNT(*) AS total FROM invoices WHERE subscription_id = ?',
      [closed.body.data.id],
    );
    assert.equal(Number(invoices.total), 0);
  });
});

describe('Invoice cancellation and reports', () => {
  test('a cancelled invoice cannot receive payments', async () => {
    const created = await api()
      .post('/api/invoices')
      .set(bearer(adminToken))
      .send({
        customerId: customer.id,
        status: 'DRAFT',
        applyDiscount: false,
        lines: [
          {
            productId: resources.product.id,
            quantity: 1,
          },
        ],
      });

    assert.equal(created.status, 201);
    assert.equal(created.body.data.status, 'DRAFT');

    const confirmed = await api()
      .post(`/api/invoices/${created.body.data.id}/confirm`)
      .set(bearer(adminToken));
    assert.equal(confirmed.status, 200);
    assert.equal(confirmed.body.data.status, 'CONFIRMED');

    const cancelled = await api()
      .post(`/api/invoices/${created.body.data.id}/cancel`)
      .set(bearer(adminToken));
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.data.status, 'CANCELLED');

    const payment = await api()
      .post('/api/payments')
      .set(bearer(adminToken))
      .send({
        invoiceId: created.body.data.id,
        paymentMethod: 'CASH',
        amount: 100,
      });
    assert.equal(payment.status, 400);
  });

  test('the reports endpoint returns live aggregates for a date range', async () => {
    const response = await api()
      .get(`/api/reports?from=${addDays(-365)}&to=${addDays(1)}`)
      .set(bearer(adminToken));

    assert.equal(response.status, 200);
    assert.ok(response.body.data.cards);
    assert.ok(Number(response.body.data.cards.totalCustomers) >= 2);
    assert.ok(Array.isArray(response.body.data.monthlyRevenue));
    assert.ok(Array.isArray(response.body.data.invoiceStatus));
    assert.ok(Array.isArray(response.body.data.topCustomers));
  });

  test('report CSV export returns a downloadable text/csv document', async () => {
    const response = await api()
      .get(`/api/reports/export?type=revenue&from=${addDays(-365)}&to=${addDays(1)}`)
      .set(bearer(adminToken));

    assert.equal(response.status, 200);
    assert.match(response.headers['content-type'], /text\/csv/);
    assert.match(response.headers['content-disposition'], /attachment/);
    assert.match(response.text, /Month,Revenue,Payments/);
  });

  test('dashboards return live figures for every role', async () => {
    const admin = await api()
      .get('/api/dashboard/admin')
      .set(bearer(adminToken));
    assert.equal(admin.status, 200);
    assert.ok(admin.body.data.cards.totalCustomers >= 1);

    const staffToken = await loginAs('STAFF');
    const staff = await api()
      .get('/api/dashboard/staff')
      .set(bearer(staffToken));
    assert.equal(staff.status, 200);
    assert.ok(staff.body.data.cards);

    const customerToken = await loginAs('CUSTOMER');
    const portal = await api()
      .get('/api/dashboard/customer')
      .set(bearer(customerToken));
    assert.equal(portal.status, 200);
    assert.ok(portal.body.data.cards);
  });
});
