import bcrypt from 'bcryptjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pool from '../src/config/database.js';
import env from '../src/config/env.js';
import { runMigrations } from './migrate.js';

const today = new Date();
today.setUTCHours(0, 0, 0, 0);

function dateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(days) {
  const date = new Date(today);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function makeLine({
  quantity,
  unitPrice,
  taxRate = 0,
  discountAmount = 0,
  description = '',
  productId,
  variantId = null,
  planId = null,
}) {
  const subtotal = roundMoney(quantity * unitPrice);
  const discount = roundMoney(Math.min(discountAmount, subtotal));
  const taxable = roundMoney(subtotal - discount);
  const taxAmount = roundMoney((taxable * taxRate) / 100);

  return {
    description,
    productId,
    variantId,
    planId,
    quantity,
    unitPrice,
    taxRate,
    taxAmount,
    discountAmount: discount,
    lineTotal: roundMoney(taxable + taxAmount),
  };
}

function sumLines(lines) {
  return lines.reduce(
    (totals, line) => ({
      subtotal: roundMoney(totals.subtotal + line.quantity * line.unitPrice),
      taxAmount: roundMoney(totals.taxAmount + line.taxAmount),
      discountAmount: roundMoney(
        totals.discountAmount + line.discountAmount,
      ),
      totalAmount: roundMoney(totals.totalAmount + line.lineTotal),
    }),
    { subtotal: 0, taxAmount: 0, discountAmount: 0, totalAmount: 0 },
  );
}

function createNumberFactory() {
  const counters = new Map();

  return {
    next(prefix, type, date = today) {
      const year = date.getUTCFullYear();
      const key = `${type}-${year}`;
      const current = (counters.get(key) ?? 0) + 1;
      counters.set(key, current);
      return {
        number: `${prefix}-${year}-${String(current).padStart(6, '0')}`,
        year,
        next: current + 1,
      };
    },
    counters,
  };
}

async function insertCustomer(connection, customer) {
  const [result] = await connection.query(
    `INSERT INTO customers
      (name, email, phone, company_name, address, city, state, country, gst_number, registration_date, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      customer.name,
      customer.email,
      customer.phone,
      customer.companyName,
      customer.address,
      customer.city,
      customer.state,
      customer.country ?? 'India',
      customer.gstNumber,
      customer.registrationDate,
      customer.status ?? 'ACTIVE',
    ],
  );

  return result.insertId;
}

async function insertUser(connection, user, passwordHash) {
  const [result] = await connection.query(
    `INSERT INTO users
      (name, email, password_hash, role, customer_id, permissions, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      user.name,
      user.email,
      passwordHash,
      user.role,
      user.customerId ?? null,
      user.permissions ? JSON.stringify(user.permissions) : null,
      user.isActive ?? 1,
    ],
  );

  return result.insertId;
}

async function insertQuotation(connection, quotation, lines, numberFactory) {
  const totals = sumLines(lines);
  const generated = numberFactory.next('QUO', 'QUOTATION');
  const [result] = await connection.query(
    `INSERT INTO quotations
      (quotation_number, customer_id, template_id, status, validity_days, valid_until,
       subtotal, discount_amount, tax_amount, total_amount, notes, created_by, sent_at, accepted_at, rejected_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      generated.number,
      quotation.customerId,
      quotation.templateId,
      quotation.status,
      quotation.validityDays ?? 30,
      dateOnly(addDays(quotation.validityDays ?? 30)),
      totals.subtotal,
      totals.discountAmount,
      totals.taxAmount,
      totals.totalAmount,
      quotation.notes ?? null,
      quotation.createdBy,
      quotation.sentAt ?? null,
      quotation.acceptedAt ?? null,
      quotation.rejectedAt ?? null,
      dateOnly(addDays(-10)),
    ],
  );

  for (const [index, line] of lines.entries()) {
    await connection.query(
      `INSERT INTO quotation_lines
        (quotation_id, product_id, variant_id, plan_id, description, quantity, unit_price,
         tax_rate, tax_amount, discount_amount, line_total, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        result.insertId,
        line.productId,
        line.variantId,
        line.planId,
        line.description,
        line.quantity,
        line.unitPrice,
        line.taxRate,
        line.taxAmount,
        line.discountAmount,
        line.lineTotal,
        index,
      ],
    );
  }

  return result.insertId;
}

async function insertSubscription(
  connection,
  subscription,
  lines,
  numberFactory,
) {
  const totals = sumLines(lines);
  const generated = numberFactory.next('SUB', 'SUBSCRIPTION');
  const [result] = await connection.query(
    `INSERT INTO subscriptions
      (subscription_number, customer_id, plan_id, quotation_id, status, start_date, expiry_date,
       next_billing_date, payment_terms_days, subtotal, discount_amount, tax_amount, total_amount,
       notes, paused_at, closed_at, close_reason, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      generated.number,
      subscription.customerId,
      subscription.planId,
      subscription.quotationId ?? null,
      subscription.status,
      subscription.startDate,
      subscription.expiryDate,
      subscription.nextBillingDate ?? null,
      subscription.paymentTermsDays ?? 30,
      totals.subtotal,
      totals.discountAmount,
      totals.taxAmount,
      totals.totalAmount,
      subscription.notes ?? null,
      subscription.pausedAt ?? null,
      subscription.closedAt ?? null,
      subscription.closeReason ?? null,
      subscription.createdBy,
      dateOnly(addDays(-120)),
    ],
  );

  for (const [index, line] of lines.entries()) {
    await connection.query(
      `INSERT INTO subscription_lines
        (subscription_id, product_id, variant_id, plan_id, description, quantity, unit_price,
         tax_rate, tax_amount, discount_amount, line_total, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        result.insertId,
        line.productId,
        line.variantId,
        line.planId,
        line.description,
        line.quantity,
        line.unitPrice,
        line.taxRate,
        line.taxAmount,
        line.discountAmount,
        line.lineTotal,
        index,
      ],
    );
  }

  await connection.query(
    `INSERT INTO subscription_history
      (subscription_id, action, from_status, to_status, notes, performed_by, created_at)
     VALUES (?, 'CREATED', NULL, ?, 'Demo subscription created.', ?, ?)`,
    [
      result.insertId,
      subscription.status,
      subscription.createdBy,
      dateOnly(addDays(-120)),
    ],
  );

  return result.insertId;
}

async function insertInvoice(connection, invoice, lines, numberFactory) {
  const totals = sumLines(lines);
  const discountAmount = invoice.discountAmount ?? 0;
  const totalAmount = roundMoney(totals.totalAmount - discountAmount);
  const amountPaid = roundMoney(invoice.amountPaid ?? 0);
  const balanceDue = roundMoney(totalAmount - amountPaid);
  const generated = numberFactory.next('INV', 'INVOICE', new Date(invoice.invoiceDate));
  const [result] = await connection.query(
    `INSERT INTO invoices
      (invoice_number, customer_id, subscription_id, status, invoice_date, due_date,
       billing_period_start, billing_period_end, subtotal, discount_id, discount_amount,
       tax_amount, total_amount, amount_paid, balance_due, notes, created_by, confirmed_at,
       cancelled_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      generated.number,
      invoice.customerId,
      invoice.subscriptionId ?? null,
      invoice.status,
      invoice.invoiceDate,
      invoice.dueDate,
      invoice.billingPeriodStart ?? null,
      invoice.billingPeriodEnd ?? null,
      totals.subtotal,
      invoice.discountId ?? null,
      discountAmount,
      totals.taxAmount,
      totalAmount,
      amountPaid,
      balanceDue,
      invoice.notes ?? null,
      invoice.createdBy,
      ['CONFIRMED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'].includes(
        invoice.status,
      )
        ? `${invoice.invoiceDate} 09:00:00`
        : null,
      invoice.status === 'CANCELLED' ? `${invoice.invoiceDate} 10:00:00` : null,
      `${invoice.invoiceDate} 08:00:00`,
    ],
  );

  for (const [index, line] of lines.entries()) {
    await connection.query(
      `INSERT INTO invoice_lines
        (invoice_id, product_id, variant_id, description, quantity, unit_price, tax_rate,
         tax_amount, discount_amount, line_total, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        result.insertId,
        line.productId,
        line.variantId,
        line.description,
        line.quantity,
        line.unitPrice,
        line.taxRate,
        line.taxAmount,
        line.discountAmount,
        line.lineTotal,
        index,
      ],
    );
  }

  if (invoice.discountId && discountAmount > 0) {
    await connection.query(
      `INSERT INTO discount_usages (discount_id, invoice_id, customer_id, amount, used_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        invoice.discountId,
        result.insertId,
        invoice.customerId,
        discountAmount,
        `${invoice.invoiceDate} 08:05:00`,
      ],
    );
  }

  return result.insertId;
}

async function insertPayment(connection, payment, numberFactory) {
  const generated = numberFactory.next('PAY', 'PAYMENT', new Date(payment.paymentDate));
  const [result] = await connection.query(
    `INSERT INTO payments
      (payment_number, invoice_id, customer_id, payment_method, amount, payment_date,
       transaction_reference, notes, status, recorded_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?, ?)`,
    [
      generated.number,
      payment.invoiceId,
      payment.customerId,
      payment.method,
      payment.amount,
      payment.paymentDate,
      payment.reference,
      payment.notes ?? null,
      payment.recordedBy,
      `${payment.paymentDate} 11:00:00`,
    ],
  );

  await connection.query(
    `INSERT INTO payment_transactions
      (payment_id, transaction_reference, amount, status, provider, metadata, verified_at, created_at)
     VALUES (?, ?, ?, 'VERIFIED', 'MANUAL', ?, ?, ?)`,
    [
      result.insertId,
      payment.reference,
      payment.amount,
      JSON.stringify({ source: 'demo-seed' }),
      `${payment.paymentDate} 11:01:00`,
      `${payment.paymentDate} 11:00:00`,
    ],
  );

  return result.insertId;
}

async function updateSequences(connection, counters) {
  for (const [key, lastUsed] of counters.entries()) {
    const [type, year] = key.split('-');
    await connection.query(
      `INSERT INTO document_sequences (document_type, year, next_number)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE next_number = GREATEST(next_number, VALUES(next_number))`,
      [type, Number(year), Number(lastUsed) + 1],
    );
  }
}

export async function seedDatabase({ force = false } = {}) {
  await runMigrations();

  const connection = await pool.getConnection();

  try {
    const [[{ userCount }]] = await connection.query(
      'SELECT COUNT(*) AS userCount FROM users',
    );

    if (Number(userCount) > 0 && !force) {
      console.log('[seed] Existing users found. Skipping demo seed.');
      return { skipped: true };
    }

    await connection.beginTransaction();

    if (force) {
      await connection.query('SET FOREIGN_KEY_CHECKS = 0');
      const tables = [
        'billing_logs',
        'audit_logs',
        'payment_transactions',
        'payments',
        'discount_usages',
        'invoice_lines',
        'invoices',
        'discount_subscriptions',
        'discount_products',
        'discounts',
        'subscription_history',
        'subscription_lines',
        'subscriptions',
        'quotation_lines',
        'quotations',
        'plan_prices',
        'plans',
        'product_taxes',
        'tax_rules',
        'product_variants',
        'products',
        'password_reset_tokens',
        'users',
        'customers',
        'document_sequences',
      ];

      for (const table of tables) {
        await connection.query(`DELETE FROM ${table}`);
      }

      await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    }

    const passwordHashes = {
      admin: await bcrypt.hash('Admin@1234', env.bcryptRounds),
      staff: await bcrypt.hash('Staff@1234', env.bcryptRounds),
      customer: await bcrypt.hash('Customer@1234', env.bcryptRounds),
    };

    const customerIds = [];
    customerIds.push(
      await insertCustomer(connection, {
        name: 'Aarav Mehta',
        email: 'customer@brightloop.test',
        phone: '+91 90000 10001',
        companyName: 'Northstar Analytics',
        address: '22 Riverfront Road',
        city: 'Ahmedabad',
        state: 'Gujarat',
        gstNumber: '24AACCN1234F1Z5',
        registrationDate: dateOnly(addDays(-260)),
      }),
    );
    customerIds.push(
      await insertCustomer(connection, {
        name: 'Diya Sharma',
        email: 'diya@vertexlabs.test',
        phone: '+91 90000 10002',
        companyName: 'Vertex Labs',
        address: '8 Cyber Park',
        city: 'Bengaluru',
        state: 'Karnataka',
        gstNumber: '29AACCV5678G1Z2',
        registrationDate: dateOnly(addDays(-210)),
      }),
    );
    customerIds.push(
      await insertCustomer(connection, {
        name: 'Kabir Singh',
        email: 'kabir@orbitretail.test',
        phone: '+91 90000 10003',
        companyName: 'Orbit Retail',
        address: '51 Market Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        gstNumber: '27AACCO9012H1Z8',
        registrationDate: dateOnly(addDays(-170)),
      }),
    );
    customerIds.push(
      await insertCustomer(connection, {
        name: 'Meera Iyer',
        email: 'meera@lumenstudio.test',
        phone: '+91 90000 10004',
        companyName: 'Lumen Studio',
        address: '12 Design Avenue',
        city: 'Chennai',
        state: 'Tamil Nadu',
        registrationDate: dateOnly(addDays(-130)),
      }),
    );
    customerIds.push(
      await insertCustomer(connection, {
        name: 'Rohan Patel',
        email: 'rohan@bluepeak.test',
        phone: '+91 90000 10005',
        companyName: 'Bluepeak Foods',
        address: '4 Commerce Lane',
        city: 'Surat',
        state: 'Gujarat',
        registrationDate: dateOnly(addDays(-75)),
      }),
    );
    customerIds.push(
      await insertCustomer(connection, {
        name: 'Sana Khan',
        email: 'sana@quantaedu.test',
        phone: '+91 90000 10006',
        companyName: 'Quanta Education',
        address: '77 Knowledge Park',
        city: 'Hyderabad',
        state: 'Telangana',
        registrationDate: dateOnly(addDays(-30)),
      }),
    );

    const adminId = await insertUser(
      connection,
      {
        name: 'Riya Desai',
        email: 'admin@brightloop.test',
        role: 'ADMIN',
      },
      passwordHashes.admin,
    );
    const staffId = await insertUser(
      connection,
      {
        name: 'Arjun Rao',
        email: 'staff@brightloop.test',
        role: 'STAFF',
        permissions: [
          'customers',
          'quotations',
          'subscriptions',
          'invoices',
          'payments',
        ],
      },
      passwordHashes.staff,
    );
    await insertUser(
      connection,
      {
        name: 'Neha Joshi',
        email: 'neha@brightloop.test',
        role: 'STAFF',
        permissions: ['customers', 'invoices'],
      },
      passwordHashes.staff,
    );
    await insertUser(
      connection,
      {
        name: 'Aarav Mehta',
        email: 'customer@brightloop.test',
        role: 'CUSTOMER',
        customerId: customerIds[0],
      },
      passwordHashes.customer,
    );

    const taxIds = {};
    const taxRows = [
      ['GST 18%', 18, 'GST', 'Standard GST rate for software services.'],
      ['GST 5%', 5, 'GST', 'Reduced GST rate for select services.'],
      ['CGST 9%', 9, 'GST', 'Central GST component.'],
      ['SGST 9%', 9, 'GST', 'State GST component.'],
    ];

    for (const [name, percentage, type, description] of taxRows) {
      const [result] = await connection.query(
        `INSERT INTO tax_rules (name, percentage, tax_type, description, is_active)
         VALUES (?, ?, ?, ?, 1)`,
        [name, percentage, type, description],
      );
      taxIds[name] = result.insertId;
    }

    const productIds = {};
    const productRows = [
      {
        key: 'business',
        name: 'Business Software Suite',
        type: 'Software',
        salesPrice: 1000,
        costPrice: 420,
        description:
          'A connected business workspace for sales, operations, and finance teams.',
        notes: 'Includes onboarding and standard support.',
      },
      {
        key: 'crm',
        name: 'Brightloop CRM',
        type: 'SaaS',
        salesPrice: 750,
        costPrice: 260,
        description:
          'Pipeline, contact, and customer lifecycle management for growing teams.',
        notes: 'Per-user monthly pricing.',
      },
      {
        key: 'support',
        name: 'Priority Support',
        type: 'Service',
        salesPrice: 450,
        costPrice: 180,
        description:
          'Priority response, quarterly reviews, and a dedicated success contact.',
        notes: 'Available with an active software subscription.',
      },
      {
        key: 'analytics',
        name: 'Revenue Analytics',
        type: 'Add-on',
        salesPrice: 1250,
        costPrice: 510,
        description:
          'Revenue, retention, and subscription performance analytics.',
        notes: 'Multiple GST components apply.',
      },
    ];

    for (const product of productRows) {
      const [result] = await connection.query(
        `INSERT INTO products
          (name, product_type, sales_price, cost_price, description, notes, status)
         VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')`,
        [
          product.name,
          product.type,
          product.salesPrice,
          product.costPrice,
          product.description,
          product.notes,
        ],
      );
      productIds[product.key] = result.insertId;
    }

    await connection.query(
      'INSERT INTO product_taxes (product_id, tax_rule_id) VALUES (?, ?), (?, ?), (?, ?), (?, ?), (?, ?)',
      [
        productIds.business,
        taxIds['GST 18%'],
        productIds.crm,
        taxIds['GST 18%'],
        productIds.support,
        taxIds['GST 5%'],
        productIds.analytics,
        taxIds['CGST 9%'],
        productIds.analytics,
        taxIds['SGST 9%'],
      ],
    );

    const variantIds = {};
    const variantRows = [
      ['business', 'Odoo Edition', 'Odoo', 560],
      ['business', 'Starter Edition', 'Brightloop', 0],
      ['business', 'Enterprise Edition', 'Brightloop', 1400],
      ['crm', 'Growth', 'Brightloop', 250],
      ['crm', 'Scale', 'Brightloop', 700],
      ['analytics', 'Standard', 'Brightloop', 0],
      ['analytics', 'Advanced', 'Brightloop', 850],
      ['support', 'Premium', 'Brightloop', 300],
    ];

    for (const [productKey, name, brand, additionalPrice] of variantRows) {
      const [result] = await connection.query(
        `INSERT INTO product_variants
          (product_id, name, brand, additional_price, is_active)
         VALUES (?, ?, ?, ?, 1)`,
        [productIds[productKey], name, brand, additionalPrice],
      );
      variantIds[`${productKey}:${name}`] = result.insertId;
    }

    const planIds = {};
    const planRows = [
      {
        key: 'growthMonthly',
        name: 'Growth Monthly',
        productKey: 'business',
        frequency: 'MONTHLY',
        price: 1000,
        minQuantity: 1,
      },
      {
        key: 'scaleYearly',
        name: 'Scale Yearly',
        productKey: 'business',
        frequency: 'YEARLY',
        price: 20000,
        minQuantity: 2,
      },
      {
        key: 'crmMonthly',
        name: 'CRM Professional',
        productKey: 'crm',
        frequency: 'MONTHLY',
        price: 2500,
        minQuantity: 1,
      },
      {
        key: 'analyticsWeekly',
        name: 'Analytics Weekly',
        productKey: 'analytics',
        frequency: 'WEEKLY',
        price: 1500,
        minQuantity: 1,
      },
      {
        key: 'supportDaily',
        name: 'Support Daily',
        productKey: 'support',
        frequency: 'DAILY',
        price: 150,
        minQuantity: 5,
      },
    ];

    for (const plan of planRows) {
      const [result] = await connection.query(
        `INSERT INTO plans
          (name, product_id, billing_frequency, minimum_quantity, start_date, end_date,
           auto_close, allow_early_closure, allow_pause, allow_renewal, status, description)
         VALUES (?, ?, ?, ?, ?, ?, 1, 1, 1, 1, 'ACTIVE', ?)`,
        [
          plan.name,
          productIds[plan.productKey],
          plan.frequency,
          plan.minQuantity,
          dateOnly(addDays(-365)),
          dateOnly(addDays(365)),
          `${plan.name} subscription plan.`,
        ],
      );
      planIds[plan.key] = result.insertId;

      await connection.query(
        `INSERT INTO plan_prices (plan_id, price, currency, effective_from, effective_to)
         VALUES (?, ?, 'INR', ?, NULL)`,
        [result.insertId, plan.price, dateOnly(addDays(-365))],
      );
    }

    const discountIds = {};
    const [welcomeResult] = await connection.query(
      `INSERT INTO discounts
        (name, discount_type, discount_value, minimum_purchase, minimum_quantity,
         start_date, end_date, maximum_usage, scope, is_active, created_by)
       VALUES ('Welcome 10%', 'PERCENTAGE', 10, 1000, 1, ?, ?, 100, 'ALL', 1, ?)`,
      [dateOnly(addDays(-365)), dateOnly(addDays(365)), adminId],
    );
    discountIds.welcome = welcomeResult.insertId;

    const [analyticsResult] = await connection.query(
      `INSERT INTO discounts
        (name, discount_type, discount_value, minimum_purchase, minimum_quantity,
         start_date, end_date, maximum_usage, scope, is_active, created_by)
       VALUES ('Analytics Launch Credit', 'FIXED', 500, 5000, 2, ?, ?, 50, 'PRODUCTS', 1, ?)`,
      [dateOnly(addDays(-90)), dateOnly(addDays(180)), adminId],
    );
    discountIds.analytics = analyticsResult.insertId;

    await connection.query(
      'INSERT INTO discount_products (discount_id, product_id) VALUES (?, ?)',
      [discountIds.analytics, productIds.analytics],
    );

    const templateRows = await connection.query(
      'SELECT id, name FROM quotation_templates ORDER BY id',
    );
    const templates = templateRows[0];
    const standardTemplate = templates.find(
      (template) => template.name === 'Standard Quotation',
    );

    const numberFactory = createNumberFactory();

    const businessLine = makeLine({
      productId: productIds.business,
      variantId: variantIds['business:Odoo Edition'],
      quantity: 1,
      unitPrice: 1560,
      taxRate: 18,
      description: 'Business Software Suite — Odoo Edition',
    });
    const analyticsLine = makeLine({
      productId: productIds.analytics,
      variantId: variantIds['analytics:Advanced'],
      quantity: 1,
      unitPrice: 2100,
      taxRate: 18,
      description: 'Revenue Analytics — Advanced',
    });

    await insertQuotation(
      connection,
      {
        customerId: customerIds[2],
        templateId: standardTemplate?.id ?? null,
        status: 'SENT',
        validityDays: 30,
        notes: 'Please review the attached proposal.',
        createdBy: staffId,
        sentAt: dateOnly(addDays(-4)),
      },
      [
        makeLine({
          productId: productIds.crm,
          variantId: variantIds['crm:Growth'],
          quantity: 5,
          unitPrice: 1000,
          taxRate: 18,
          description: 'Brightloop CRM — Growth, 5 seats',
        }),
        makeLine({
          productId: productIds.support,
          variantId: variantIds['support:Premium'],
          quantity: 1,
          unitPrice: 750,
          taxRate: 5,
          description: 'Priority Support — Premium',
        }),
      ],
      numberFactory,
    );

    await insertQuotation(
      connection,
      {
        customerId: customerIds[4],
        templateId: standardTemplate?.id ?? null,
        status: 'ACCEPTED',
        validityDays: 30,
        notes: 'Accepted by the customer. Ready for subscription conversion.',
        createdBy: adminId,
        sentAt: dateOnly(addDays(-12)),
        acceptedAt: dateOnly(addDays(-9)),
      },
      [
        makeLine({
          productId: productIds.business,
          variantId: variantIds['business:Enterprise Edition'],
          quantity: 1,
          unitPrice: 2400,
          taxRate: 18,
          description: 'Business Software Suite — Enterprise Edition',
        }),
      ],
      numberFactory,
    );

    await insertQuotation(
      connection,
      {
        customerId: customerIds[5],
        templateId: standardTemplate?.id ?? null,
        status: 'DRAFT',
        validityDays: 45,
        notes: 'Draft proposal for the new education program.',
        createdBy: staffId,
      },
      [
        makeLine({
          productId: productIds.analytics,
          variantId: variantIds['analytics:Standard'],
          quantity: 2,
          unitPrice: 1250,
          taxRate: 18,
          description: 'Revenue Analytics — Standard',
        }),
      ],
      numberFactory,
    );

    const subscription1 = await insertSubscription(
      connection,
      {
        customerId: customerIds[0],
        planId: planIds.growthMonthly,
        status: 'ACTIVE',
        startDate: dateOnly(addDays(-75)),
        expiryDate: dateOnly(addDays(290)),
        nextBillingDate: dateOnly(addDays(15)),
        paymentTermsDays: 30,
        createdBy: adminId,
      },
      [businessLine],
      numberFactory,
    );

    const subscription2 = await insertSubscription(
      connection,
      {
        customerId: customerIds[1],
        planId: planIds.scaleYearly,
        status: 'ACTIVE',
        startDate: dateOnly(addDays(-60)),
        expiryDate: dateOnly(addDays(305)),
        nextBillingDate: dateOnly(addDays(120)),
        paymentTermsDays: 45,
        createdBy: adminId,
      },
      [
        makeLine({
          productId: productIds.business,
          variantId: variantIds['business:Enterprise Edition'],
          quantity: 2,
          unitPrice: 2400,
          taxRate: 18,
          description: 'Business Software Suite — Enterprise Edition',
        }),
      ],
      numberFactory,
    );

    await insertSubscription(
      connection,
      {
        customerId: customerIds[2],
        planId: planIds.crmMonthly,
        status: 'PAUSED',
        startDate: dateOnly(addDays(-100)),
        expiryDate: dateOnly(addDays(265)),
        nextBillingDate: dateOnly(addDays(8)),
        paymentTermsDays: 30,
        pausedAt: `${dateOnly(addDays(-5))} 10:00:00`,
        createdBy: staffId,
      },
      [
        makeLine({
          productId: productIds.crm,
          variantId: variantIds['crm:Scale'],
          quantity: 3,
          unitPrice: 3200,
          taxRate: 18,
          description: 'Brightloop CRM — Scale, 3 seats',
        }),
      ],
      numberFactory,
    );

    const subscription4 = await insertSubscription(
      connection,
      {
        customerId: customerIds[3],
        planId: planIds.growthMonthly,
        status: 'CLOSED',
        startDate: dateOnly(addDays(-210)),
        expiryDate: dateOnly(addDays(-30)),
        nextBillingDate: null,
        paymentTermsDays: 30,
        closedAt: `${dateOnly(addDays(-30))} 16:00:00`,
        closeReason: 'Customer moved to a different product line.',
        createdBy: adminId,
      },
      [
        makeLine({
          productId: productIds.business,
          variantId: variantIds['business:Starter Edition'],
          quantity: 1,
          unitPrice: 1000,
          taxRate: 18,
          description: 'Business Software Suite — Starter Edition',
        }),
      ],
      numberFactory,
    );

    await insertSubscription(
      connection,
      {
        customerId: customerIds[4],
        planId: planIds.analyticsWeekly,
        status: 'DRAFT',
        startDate: dateOnly(addDays(1)),
        expiryDate: dateOnly(addDays(90)),
        nextBillingDate: dateOnly(addDays(1)),
        paymentTermsDays: 15,
        createdBy: staffId,
      },
      [analyticsLine],
      numberFactory,
    );

    const subscription6 = await insertSubscription(
      connection,
      {
        customerId: customerIds[5],
        planId: planIds.supportDaily,
        status: 'ACTIVE',
        startDate: dateOnly(addDays(-20)),
        expiryDate: dateOnly(addDays(160)),
        nextBillingDate: dateOnly(addDays(-1)),
        paymentTermsDays: 15,
        createdBy: adminId,
      },
      [
        makeLine({
          productId: productIds.support,
          variantId: variantIds['support:Premium'],
          quantity: 5,
          unitPrice: 750,
          taxRate: 5,
          description: 'Priority Support — Premium, 5 units',
        }),
      ],
      numberFactory,
    );

    const invoice1 = await insertInvoice(
      connection,
      {
        customerId: customerIds[0],
        subscriptionId: subscription1,
        status: 'PAID',
        invoiceDate: dateOnly(addDays(-45)),
        dueDate: dateOnly(addDays(-15)),
        billingPeriodStart: dateOnly(addDays(-45)),
        billingPeriodEnd: dateOnly(addDays(-16)),
        discountId: discountIds.welcome,
        discountAmount: 184.08,
        amountPaid: 1656.72,
        createdBy: adminId,
      },
      [businessLine],
      numberFactory,
    );

    const invoice2 = await insertInvoice(
      connection,
      {
        customerId: customerIds[0],
        subscriptionId: subscription1,
        status: 'PARTIALLY_PAID',
        invoiceDate: dateOnly(addDays(-15)),
        dueDate: dateOnly(addDays(15)),
        billingPeriodStart: dateOnly(addDays(-15)),
        billingPeriodEnd: dateOnly(addDays(14)),
        amountPaid: 500,
        createdBy: adminId,
      },
      [businessLine],
      numberFactory,
    );

    const invoice3 = await insertInvoice(
      connection,
      {
        customerId: customerIds[1],
        subscriptionId: subscription2,
        status: 'OVERDUE',
        invoiceDate: dateOnly(addDays(-60)),
        dueDate: dateOnly(addDays(-15)),
        billingPeriodStart: dateOnly(addDays(-60)),
        billingPeriodEnd: dateOnly(addDays(305)),
        createdBy: adminId,
      },
      [
        makeLine({
          productId: productIds.business,
          variantId: variantIds['business:Enterprise Edition'],
          quantity: 2,
          unitPrice: 2400,
          taxRate: 18,
          description: 'Business Software Suite — Enterprise Edition',
        }),
      ],
      numberFactory,
    );

    await insertInvoice(
      connection,
      {
        customerId: customerIds[2],
        status: 'CONFIRMED',
        invoiceDate: dateOnly(addDays(-10)),
        dueDate: dateOnly(addDays(20)),
        createdBy: staffId,
      },
      [
        makeLine({
          productId: productIds.crm,
          variantId: variantIds['crm:Growth'],
          quantity: 4,
          unitPrice: 1000,
          taxRate: 18,
          description: 'Brightloop CRM — Growth, 4 seats',
        }),
      ],
      numberFactory,
    );

    const invoice5 = await insertInvoice(
      connection,
      {
        customerId: customerIds[3],
        subscriptionId: subscription4,
        status: 'PAID',
        invoiceDate: dateOnly(addDays(-120)),
        dueDate: dateOnly(addDays(-90)),
        billingPeriodStart: dateOnly(addDays(-120)),
        billingPeriodEnd: dateOnly(addDays(-91)),
        amountPaid: 1180,
        createdBy: adminId,
      },
      [
        makeLine({
          productId: productIds.business,
          variantId: variantIds['business:Starter Edition'],
          quantity: 1,
          unitPrice: 1000,
          taxRate: 18,
          description: 'Business Software Suite — Starter Edition',
        }),
      ],
      numberFactory,
    );

    await insertInvoice(
      connection,
      {
        customerId: customerIds[4],
        status: 'DRAFT',
        invoiceDate: dateOnly(addDays(-5)),
        dueDate: dateOnly(addDays(25)),
        createdBy: staffId,
      },
      [
        makeLine({
          productId: productIds.analytics,
          variantId: variantIds['analytics:Advanced'],
          quantity: 1,
          unitPrice: 2100,
          taxRate: 18,
          description: 'Revenue Analytics — Advanced',
        }),
      ],
      numberFactory,
    );

    const historicalInvoices = [];
    const historicalPaymentDates = [-90, -150, -210, -270, -330];
    const historicalCustomers = [4, 1, 2, 3, 4];
    const historicalAmounts = [2950, 1770, 2950, 1770, 2950];

    for (let index = 0; index < historicalPaymentDates.length; index += 1) {
      const invoiceDate = dateOnly(addDays(historicalPaymentDates[index]));
      const dueDate = dateOnly(addDays(historicalPaymentDates[index] + 30));
      const amount = historicalAmounts[index];
      const invoiceId = await insertInvoice(
        connection,
        {
          customerId: customerIds[historicalCustomers[index]],
          status: 'PAID',
          invoiceDate,
          dueDate,
          amountPaid: amount,
          createdBy: adminId,
        },
        [
          makeLine({
            productId:
              index % 2 === 0 ? productIds.crm : productIds.business,
            quantity: 1,
            unitPrice:
              index % 2 === 0 ? 2500 : 1500,
            taxRate: 18,
            description:
              index % 2 === 0
                ? 'Brightloop CRM — Professional'
                : 'Business Software Suite',
          }),
        ],
        numberFactory,
      );
      historicalInvoices.push({ id: invoiceId, amount, date: invoiceDate });
    }

    await insertInvoice(
      connection,
      {
        customerId: customerIds[0],
        status: 'CANCELLED',
        invoiceDate: dateOnly(addDays(-7)),
        dueDate: dateOnly(addDays(23)),
        notes: 'Cancelled after the customer changed their order.',
        createdBy: adminId,
      },
      [
        makeLine({
          productId: productIds.support,
          quantity: 2,
          unitPrice: 450,
          taxRate: 5,
          description: 'Priority Support',
        }),
      ],
      numberFactory,
    );

    const paymentRows = [
      {
        invoiceId: invoice1,
        customerId: customerIds[0],
        amount: 1656.72,
        paymentDate: dateOnly(addDays(-14)),
        method: 'UPI',
        reference: 'UPI-DEMO-1001',
      },
      {
        invoiceId: invoice2,
        customerId: customerIds[0],
        amount: 500,
        paymentDate: dateOnly(addDays(-10)),
        method: 'BANK_TRANSFER',
        reference: 'NEFT-DEMO-1002',
      },
      {
        invoiceId: invoice5,
        customerId: customerIds[3],
        amount: 1180,
        paymentDate: dateOnly(addDays(-88)),
        method: 'CARD',
        reference: 'CARD-DEMO-1003',
      },
    ];

    for (const [index, invoice] of historicalInvoices.entries()) {
      paymentRows.push({
        invoiceId: invoice.id,
        customerId: customerIds[historicalCustomers[index]],
        amount: invoice.amount,
        paymentDate: invoice.date,
        method: ['CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'OTHER'][index % 5],
        reference: `HIST-DEMO-${1004 + index}`,
      });
    }

    for (const payment of paymentRows) {
      await insertPayment(
        connection,
        { ...payment, recordedBy: adminId },
        numberFactory,
      );
    }

    await connection.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, created_at)
       VALUES
        (?, 'LOGIN', 'USER', ?, ?, '127.0.0.1', ?),
        (?, 'CREATE', 'PAYMENT', ?, ?, '127.0.0.1', ?)`,
      [
        adminId,
        adminId,
        JSON.stringify({ email: 'admin@brightloop.test' }),
        `${dateOnly(addDays(-1))} 09:00:00`,
        adminId,
        paymentRows[0] ? 1 : null,
        JSON.stringify({ note: 'Demo payment recorded' }),
        `${dateOnly(addDays(-14))} 11:00:00`,
      ],
    );

    await connection.query(
      `INSERT INTO billing_logs (subscription_id, invoice_id, status, message, details, created_at)
       VALUES (?, ?, 'SUCCESS', 'Demo invoice generated from subscription.', ?, ?)`,
      [
        subscription1,
        invoice1,
        JSON.stringify({ source: 'demo-seed' }),
        `${dateOnly(addDays(-45))} 02:00:00`,
      ],
    );

    await updateSequences(connection, numberFactory.counters);

    await connection.commit();

    console.log('[seed] Demo data created successfully.');
    console.log('[seed] admin@brightloop.test / Admin@1234');
    console.log('[seed] staff@brightloop.test / Staff@1234');
    console.log('[seed] customer@brightloop.test / Customer@1234');

    return {
      skipped: false,
      customerCount: customerIds.length,
      adminId,
      staffId,
      subscriptionId: subscription1,
      invoiceId: invoice1,
      dueSubscriptionId: subscription6,
      invoice3Id: invoice3,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  const force = process.argv.includes('--force');
  seedDatabase({ force })
    .then(() => pool.end())
    .catch(async (error) => {
      console.error('[seed] Failed:', error);
      await pool.end();
      process.exit(1);
    });
}
