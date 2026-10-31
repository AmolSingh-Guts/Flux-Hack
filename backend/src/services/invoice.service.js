import { withTransaction } from '../config/database.js';
import {
  createInvoice,
  deleteInvoice,
  findInvoiceById,
  findInvoiceBySubscriptionPeriod,
  findInvoiceForUpdate,
  insertInvoiceLines,
  invoiceDependencyCounts,
  listInvoices,
  markOverdueInvoices,
  paymentTotalsForInvoice,
  replaceInvoiceLines,
  updateInvoice,
} from '../models/invoice.model.js';
import {
  addSubscriptionHistory,
  findSubscriptionForUpdate,
  updateSubscriptionState,
} from '../models/subscription.model.js';
import { findCustomerById } from '../models/customer.model.js';
import {
  findApplicableDiscount,
  recordDiscountUsage,
} from '../models/discount.model.js';
import { getCompanySettings } from '../models/settings.model.js';
import ApiError from '../utils/ApiError.js';
import { parsePagination, paginationMeta } from '../utils/pagination.utils.js';
import {
  addBillingPeriod,
  addDays,
  isAfter,
  previousDay,
  todayString,
} from '../utils/date.utils.js';
import { roundMoney, toNumber } from '../utils/money.utils.js';
import { nextConfiguredDocumentNumber } from './document-number.service.js';
import { calculateInvoiceTotal, priceLines } from './pricing.service.js';
import { generateInvoicePdf } from './pdf.service.js';
import { sendDocumentEmail } from './email.service.js';
import { writeAuditLog } from './audit.service.js';

function invoiceStatusForTotals({ currentStatus, paid, total, dueDate }) {
  if (currentStatus === 'CANCELLED') {
    return 'CANCELLED';
  }

  if (currentStatus === 'DRAFT') {
    return 'DRAFT';
  }

  if (paid >= roundMoney(total) - 0.005) {
    return 'PAID';
  }

  if (dueDate && dueDate < todayString()) {
    return 'OVERDUE';
  }

  if (paid > 0) {
    return 'PARTIALLY_PAID';
  }

  return 'CONFIRMED';
}

export async function recalculateInvoiceStatus(connection, invoiceId) {
  const invoice = await findInvoiceForUpdate(connection, invoiceId);

  if (!invoice) {
    throw new ApiError(404, 'Invoice not found.');
  }

  if (invoice.status === 'CANCELLED') {
    return invoice;
  }

  const paid = roundMoney(await paymentTotalsForInvoice(connection, invoiceId));
  const total = roundMoney(invoice.total_amount);
  const balanceDue = roundMoney(Math.max(0, total - paid));
  const status = invoiceStatusForTotals({
    currentStatus: invoice.status,
    paid,
    total,
    dueDate: invoice.due_date,
  });

  await updateInvoice(connection, invoiceId, {
    amountPaid: paid,
    balanceDue,
    status,
  });

  return { ...invoice, amount_paid: paid, balance_due: balanceDue, status };
}

async function buildInvoice(
  connection,
  {
    customerId,
    subscriptionId = null,
    lines,
    invoiceDate,
    dueDate,
    billingPeriodStart = null,
    billingPeriodEnd = null,
    paymentTermsDays = 30,
    notes,
    status = 'DRAFT',
    discountId = null,
    applyDiscount = true,
    createdBy,
  },
) {
  const productIds = lines
    .map((line) => line.productId)
    .filter((value) => value !== null && value !== undefined);
  const totalQuantity = lines.reduce(
    (sum, line) => sum + toNumber(line.quantity),
    0,
  );
  const lineSubtotal = roundMoney(
    lines.reduce(
      (sum, line) => sum + toNumber(line.quantity) * toNumber(line.unitPrice),
      0,
    ),
  );
  const lineDiscount = roundMoney(
    lines.reduce((sum, line) => sum + toNumber(line.discountAmount), 0),
  );

  let discount = null;

  if (discountId) {
    const [rows] = await connection.query(
      'SELECT * FROM discounts WHERE id = ? AND is_active = 1 FOR UPDATE',
      [discountId],
    );

    if (!rows[0]) {
      throw new ApiError(400, 'The selected discount is not available.');
    }

    const discountRow = rows[0];
    const amount =
      discountRow.discount_type === 'PERCENTAGE'
        ? roundMoney((lineSubtotal * Number(discountRow.discount_value)) / 100)
        : roundMoney(Number(discountRow.discount_value));

    discount = {
      discount: discountRow,
      amount: Math.min(amount, Math.max(0, lineSubtotal - lineDiscount)),
    };
  } else if (applyDiscount) {
    discount = await findApplicableDiscount(connection, {
      subtotal: lineSubtotal,
      quantity: totalQuantity,
      productIds,
      subscriptionId,
    });
  }

  const headerDiscount = Math.min(
    discount?.amount ?? 0,
    Math.max(0, lineSubtotal - lineDiscount),
  );
  const totals = calculateInvoiceTotal(lines, headerDiscount);
  const invoiceNumber = await nextConfiguredDocumentNumber(connection, {
    type: 'INVOICE',
    settingKey: 'invoice_prefix',
    fallbackPrefix: 'INV',
    date: new Date(`${invoiceDate}T00:00:00.000Z`),
  });
  const effectiveDueDate =
    dueDate ?? addDays(invoiceDate, paymentTermsDays);

  const invoiceId = await createInvoice(connection, {
    invoiceNumber,
    customerId,
    subscriptionId,
    status,
    invoiceDate,
    dueDate: effectiveDueDate,
    billingPeriodStart,
    billingPeriodEnd,
    subtotal: totals.subtotal,
    discountId: headerDiscount > 0 ? discount?.discount.id ?? null : null,
    discountAmount: totals.discountAmount,
    taxAmount: totals.taxAmount,
    totalAmount: totals.totalAmount,
    amountPaid: 0,
    balanceDue: totals.totalAmount,
    currency: 'INR',
    notes,
    createdBy,
    confirmedAt: status === 'CONFIRMED' ? new Date() : null,
  });

  await insertInvoiceLines(
    connection,
    invoiceId,
    lines.map((line, index) => ({ ...line, sortOrder: index })),
  );

  if (headerDiscount > 0 && discount?.discount) {
    await recordDiscountUsage(connection, {
      discountId: discount.discount.id,
      invoiceId,
      customerId,
      amount: headerDiscount,
    });
  }

  return {
    invoiceId,
    invoiceNumber,
    totalAmount: totals.totalAmount,
    discountAmount: totals.discountAmount,
    discountId: headerDiscount > 0 ? discount?.discount.id ?? null : null,
  };
}

async function ensureCustomer(customerId) {
  const customer = await findCustomerById(customerId);

  if (!customer) {
    throw new ApiError(400, 'The selected customer does not exist.');
  }

  if (customer.status === 'ARCHIVED') {
    throw new ApiError(400, 'Invoices cannot be created for archived customers.');
  }

  return customer;
}

export async function listInvoiceRecords(query) {
  await markOverdueInvoices();
  const pagination = parsePagination(query, {
    allowedSortFields: [
      'invoice_number',
      'customer_name',
      'status',
      'invoice_date',
      'due_date',
      'total_amount',
      'balance_due',
      'created_at',
    ],
    defaultSortBy: 'invoice_date',
  });
  const result = await listInvoices({ ...query, ...pagination });

  return {
    rows: result.rows,
    meta: paginationMeta({ ...pagination, total: result.total }),
  };
}

export async function getInvoice(invoiceId) {
  await markOverdueInvoices();
  const invoice = await findInvoiceById(invoiceId);

  if (!invoice) {
    throw new ApiError(404, 'Invoice not found.');
  }

  return invoice;
}

export async function createManualInvoice(payload, context = {}) {
  const customer = await ensureCustomer(payload.customerId);
  const invoiceDate = payload.invoiceDate ?? todayString();
  const dueDate =
    payload.dueDate ??
    addDays(invoiceDate, payload.paymentTermsDays ?? 30);

  if (dueDate < invoiceDate) {
    throw new ApiError(400, 'Due date cannot be before the invoice date.');
  }

  const invoiceId = await withTransaction(async (connection) => {
    if (payload.subscriptionId) {
      const subscription = await findSubscriptionForUpdate(
        connection,
        payload.subscriptionId,
      );

      if (
        !subscription ||
        String(subscription.customer_id) !== String(customer.id)
      ) {
        throw new ApiError(
          400,
          'The selected subscription does not belong to this customer.',
        );
      }
    }

    const { lines } = await priceLines(connection, payload.lines);
    const result = await buildInvoice(connection, {
      customerId: customer.id,
      subscriptionId: payload.subscriptionId ?? null,
      lines,
      invoiceDate,
      dueDate,
      paymentTermsDays: payload.paymentTermsDays ?? 30,
      notes: payload.notes,
      status: payload.status ?? 'DRAFT',
      discountId: payload.discountId ?? null,
      applyDiscount: payload.applyDiscount !== false,
      createdBy: context.actor?.id,
    });

    await writeAuditLog({
      userId: context.actor?.id,
      action: 'CREATE',
      entityType: 'INVOICE',
      entityId: result.invoiceId,
      details: {
        invoiceNumber: result.invoiceNumber,
        customerId: customer.id,
        subscriptionId: payload.subscriptionId ?? null,
      },
      ipAddress: context.ipAddress,
      connection,
    });

    return result.invoiceId;
  });

  return getInvoice(invoiceId);
}

export async function updateDraftInvoice(invoiceId, payload, context = {}) {
  const existing = await getInvoice(invoiceId);

  if (existing.status !== 'DRAFT') {
    throw new ApiError(400, 'Only draft invoices can be edited.');
  }

  const invoiceDate = payload.invoiceDate ?? existing.invoice_date;
  const dueDate =
    payload.dueDate ??
    (payload.invoiceDate
      ? addDays(invoiceDate, existing.payment_terms_days ?? 30)
      : existing.due_date);

  if (dueDate < invoiceDate) {
    throw new ApiError(400, 'Due date cannot be before the invoice date.');
  }

  await withTransaction(async (connection) => {
    const changes = {
      invoiceDate,
      dueDate,
      notes: payload.notes,
    };

    if (payload.lines) {
      const { lines } = await priceLines(connection, payload.lines);
      const lineSubtotal = roundMoney(
        lines.reduce(
          (sum, line) => sum + toNumber(line.quantity) * toNumber(line.unitPrice),
          0,
        ),
      );
      const lineDiscount = roundMoney(
        lines.reduce((sum, line) => sum + toNumber(line.discountAmount), 0),
      );
      const discount = payload.applyDiscount === false
        ? null
        : await findApplicableDiscount(connection, {
            subtotal: lineSubtotal,
            quantity: lines.reduce(
              (sum, line) => sum + toNumber(line.quantity),
              0,
            ),
            productIds: lines
              .map((line) => line.productId)
              .filter((value) => value !== null && value !== undefined),
            subscriptionId: existing.subscription_id,
          });
      const headerDiscount = Math.min(
        discount?.amount ?? 0,
        Math.max(0, lineSubtotal - lineDiscount),
      );
      const totals = calculateInvoiceTotal(lines, headerDiscount);

      Object.assign(changes, {
        subtotal: totals.subtotal,
        discountId: headerDiscount > 0 ? discount?.discount.id ?? null : null,
        discountAmount: totals.discountAmount,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        balanceDue: totals.totalAmount,
      });

      await connection.query('DELETE FROM discount_usages WHERE invoice_id = ?', [
        invoiceId,
      ]);
      await replaceInvoiceLines(connection, invoiceId, lines);

      if (headerDiscount > 0 && discount?.discount) {
        await recordDiscountUsage(connection, {
          discountId: discount.discount.id,
          invoiceId,
          customerId: existing.customer_id,
          amount: headerDiscount,
        });
      }
    }

    await updateInvoice(connection, invoiceId, changes);
    await writeAuditLog({
      userId: context.actor?.id,
      action: 'UPDATE',
      entityType: 'INVOICE',
      entityId: invoiceId,
      details: { changedFields: Object.keys(payload) },
      ipAddress: context.ipAddress,
      connection,
    });
  });

  return getInvoice(invoiceId);
}

export async function confirmInvoice(invoiceId, context = {}) {
  await withTransaction(async (connection) => {
    const invoice = await findInvoiceForUpdate(connection, invoiceId);

    if (!invoice) {
      throw new ApiError(404, 'Invoice not found.');
    }

    if (invoice.status !== 'DRAFT') {
      throw new ApiError(400, 'Only draft invoices can be confirmed.');
    }

    await updateInvoice(connection, invoiceId, {
      status: 'CONFIRMED',
      confirmedAt: new Date(),
    });
    await recalculateInvoiceStatus(connection, invoiceId);
    await writeAuditLog({
      userId: context.actor?.id,
      action: 'CONFIRM',
      entityType: 'INVOICE',
      entityId: invoiceId,
      ipAddress: context.ipAddress,
      connection,
    });
  });

  return getInvoice(invoiceId);
}

export async function cancelInvoice(invoiceId, context = {}) {
  await withTransaction(async (connection) => {
    const invoice = await findInvoiceForUpdate(connection, invoiceId);

    if (!invoice) {
      throw new ApiError(404, 'Invoice not found.');
    }

    if (invoice.status === 'CANCELLED') {
      throw new ApiError(400, 'Invoice is already cancelled.');
    }

    const dependencies = await invoiceDependencyCounts(invoiceId, connection);

    if (Number(dependencies.payments) > 0 || Number(invoice.amount_paid) > 0) {
      throw new ApiError(
        409,
        'Invoices with recorded payments cannot be cancelled. Void the payments first.',
      );
    }

    await updateInvoice(connection, invoiceId, {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      balanceDue: 0,
    });
    await connection.query('DELETE FROM discount_usages WHERE invoice_id = ?', [
      invoiceId,
    ]);
    await writeAuditLog({
      userId: context.actor?.id,
      action: 'CANCEL',
      entityType: 'INVOICE',
      entityId: invoiceId,
      ipAddress: context.ipAddress,
      connection,
    });
  });

  return getInvoice(invoiceId);
}

export async function deleteDraftInvoice(invoiceId, context = {}) {
  const invoice = await getInvoice(invoiceId);

  if (invoice.status !== 'DRAFT') {
    throw new ApiError(400, 'Only draft invoices can be deleted.');
  }

  const dependencies = await invoiceDependencyCounts(invoiceId);

  if (Number(dependencies.payments) > 0) {
    throw new ApiError(409, 'Invoices with payments cannot be deleted.');
  }

  await withTransaction(async (connection) => {
    await connection.query('DELETE FROM discount_usages WHERE invoice_id = ?', [
      invoiceId,
    ]);
    await deleteInvoice(connection, invoiceId);
    await writeAuditLog({
      userId: context.actor?.id,
      action: 'DELETE',
      entityType: 'INVOICE',
      entityId: invoiceId,
      ipAddress: context.ipAddress,
      connection,
    });
  });

  return { message: 'Invoice deleted.' };
}

export async function invoicePdf(invoiceId) {
  const invoice = await getInvoice(invoiceId);
  const company = await getCompanySettings();
  const buffer = await generateInvoicePdf(invoice, company);

  return { buffer, filename: `${invoice.invoice_number}.pdf`, invoice };
}

export async function sendInvoiceEmail(invoiceId, payload = {}, context = {}) {
  const invoice = await getInvoice(invoiceId);

  if (invoice.status === 'CANCELLED') {
    throw new ApiError(400, 'Cancelled invoices cannot be emailed.');
  }

  const company = await getCompanySettings();
  const buffer = await generateInvoicePdf(invoice, company);
  const message =
    payload.message ||
    `Please find invoice ${invoice.invoice_number} attached. The amount due is ${invoice.balance_due} ${invoice.currency}, payable by ${invoice.due_date}.`;

  await sendDocumentEmail({
    to: invoice.customer_email,
    customerName: invoice.customer_name,
    subject: `Invoice ${invoice.invoice_number} from ${company.company_name}`,
    message,
    documentLabel: 'invoice',
    attachment: {
      filename: `${invoice.invoice_number}.pdf`,
      content: buffer,
      contentType: 'application/pdf',
    },
  });

  await writeAuditLog({
    userId: context.actor?.id,
    action: 'SEND',
    entityType: 'INVOICE',
    entityId: invoiceId,
    details: { to: invoice.customer_email },
    ipAddress: context.ipAddress,
  });

  return invoice;
}

async function subscriptionLines(connection, subscriptionId) {
  const [rows] = await connection.query(
    `SELECT sl.*, p.name AS product_name, pv.name AS variant_name
     FROM subscription_lines sl
     INNER JOIN products p ON p.id = sl.product_id
     LEFT JOIN product_variants pv ON pv.id = sl.variant_id
     WHERE sl.subscription_id = ?
     ORDER BY sl.sort_order ASC, sl.id ASC`,
    [subscriptionId],
  );

  return rows;
}

export async function createSubscriptionInvoiceInTransaction(
  connection,
  subscriptionId,
  payload = {},
  context = {},
) {
  const subscription = await findSubscriptionForUpdate(connection, subscriptionId);

  if (!subscription) {
    throw new ApiError(404, 'Subscription not found.');
  }

  if (subscription.status !== 'ACTIVE') {
    throw new ApiError(
      400,
      `Subscription ${subscription.subscription_number} is ${subscription.status.toLowerCase()} and cannot be billed.`,
    );
  }

  const billingPeriodStart =
    payload.billingPeriodStart ?? subscription.next_billing_date ?? todayString();

  if (isAfter(billingPeriodStart, subscription.expiry_date)) {
    throw new ApiError(
      400,
      `Subscription ${subscription.subscription_number} has passed its expiry date (${subscription.expiry_date}).`,
    );
  }

  const existing = await findInvoiceBySubscriptionPeriod(
    connection,
    subscriptionId,
    billingPeriodStart,
  );

  if (existing) {
    throw new ApiError(
      409,
      `Invoice ${existing.invoice_number} already exists for the billing period starting ${billingPeriodStart}.`,
    );
  }

  const periodEnd = previousDay(
    addBillingPeriod(billingPeriodStart, subscription.billing_frequency),
  );
  const billingPeriodEnd = isAfter(periodEnd, subscription.expiry_date)
    ? subscription.expiry_date
    : periodEnd;
  const invoiceDate = payload.invoiceDate ?? todayString();
  const dueDate =
    payload.dueDate ??
    addDays(invoiceDate, subscription.payment_terms_days ?? 30);
  const storedLines = await subscriptionLines(connection, subscriptionId);

  if (storedLines.length === 0) {
    throw new ApiError(400, 'Subscription has no line items to invoice.');
  }

  const lines = storedLines.map((line) => {
    const quantity = toNumber(line.quantity);
    const unitPrice = toNumber(line.unit_price);
    const discountAmount = toNumber(line.discount_amount);
    const taxRate = toNumber(line.tax_rate);
    const taxable = roundMoney(quantity * unitPrice - discountAmount);
    const taxAmount = roundMoney((taxable * taxRate) / 100);

    return {
      productId: line.product_id,
      variantId: line.variant_id,
      description: line.description,
      quantity,
      unitPrice,
      taxRate,
      taxAmount,
      discountAmount,
      lineTotal: roundMoney(taxable + taxAmount),
    };
  });

  const result = await buildInvoice(connection, {
    customerId: subscription.customer_id,
    subscriptionId,
    lines,
    invoiceDate,
    dueDate,
    billingPeriodStart,
    billingPeriodEnd,
    paymentTermsDays: subscription.payment_terms_days,
    notes:
      payload.notes ??
      `Subscription billing for ${billingPeriodStart} to ${billingPeriodEnd}.`,
    status: 'CONFIRMED',
    createdBy: context.actor?.id ?? subscription.created_by,
  });

  const nextBillingDate = addBillingPeriod(
    billingPeriodStart,
    subscription.billing_frequency,
  );
  const shouldAutoClose =
    Boolean(subscription.auto_close) &&
    isAfter(nextBillingDate, subscription.expiry_date);

  if (shouldAutoClose) {
    await updateSubscriptionState(connection, subscriptionId, {
      status: 'CLOSED',
      closedAt: new Date(),
      closeReason: `Subscription expired after the billing period ending ${billingPeriodEnd}.`,
      nextBillingDate: null,
    });
    await addSubscriptionHistory(connection, {
      subscriptionId,
      action: 'AUTO_CLOSED',
      fromStatus: 'ACTIVE',
      toStatus: 'CLOSED',
      notes: `Automatically closed after generating invoice ${result.invoiceNumber}.`,
      performedBy: context.actor?.id,
    });
  } else {
    await updateSubscriptionState(connection, subscriptionId, {
      nextBillingDate,
    });
  }

  await addSubscriptionHistory(connection, {
    subscriptionId,
    action: 'INVOICE_GENERATED',
    fromStatus: subscription.status,
    toStatus: shouldAutoClose ? 'CLOSED' : subscription.status,
    notes: `Invoice ${result.invoiceNumber} generated for ${billingPeriodStart} to ${billingPeriodEnd}.`,
    performedBy: context.actor?.id,
  });

  await writeAuditLog({
    userId: context.actor?.id,
    action: 'GENERATE_INVOICE',
    entityType: 'INVOICE',
    entityId: result.invoiceId,
    details: {
      subscriptionId,
      billingPeriodStart,
      billingPeriodEnd,
      invoiceNumber: result.invoiceNumber,
    },
    ipAddress: context.ipAddress,
    connection,
  });

  return {
    ...result,
    billingPeriodStart,
    billingPeriodEnd,
    nextBillingDate: shouldAutoClose ? null : nextBillingDate,
    autoClosed: shouldAutoClose,
  };
}

export async function generateSubscriptionInvoice(
  subscriptionId,
  payload = {},
  context = {},
) {
  const result = await withTransaction((connection) =>
    createSubscriptionInvoiceInTransaction(
      connection,
      subscriptionId,
      payload,
      context,
    ),
  );

  return {
    ...result,
    invoice: await getInvoice(result.invoiceId),
  };
}
