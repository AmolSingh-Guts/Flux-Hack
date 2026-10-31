import { withTransaction } from '../config/database.js';
import {
  addSubscriptionHistory,
  createSubscription,
  deleteSubscription,
  findDueSubscriptions,
  findSubscriptionById,
  findSubscriptionForUpdate,
  insertSubscriptionLines,
  listSubscriptions,
  replaceSubscriptionLines,
  subscriptionDependencyCounts,
  updateSubscription,
  updateSubscriptionState,
} from '../models/subscription.model.js';
import { findCustomerById } from '../models/customer.model.js';
import { findPlanById } from '../models/plan.model.js';
import ApiError from '../utils/ApiError.js';
import { parsePagination, paginationMeta } from '../utils/pagination.utils.js';
import {
  addBillingPeriod,
  addDays,
  addMonths,
  differenceInDays,
  isAfter,
  todayString,
} from '../utils/date.utils.js';
import { nextConfiguredDocumentNumber } from './document-number.service.js';
import { priceLines } from './pricing.service.js';
import { writeAuditLog } from './audit.service.js';

const editableStatuses = new Set(['DRAFT', 'QUOTATION']);
const renewableStatuses = new Set(['ACTIVE', 'PAUSED', 'CLOSED']);

function defaultExpiryDate(startDate, plan) {
  if (plan.end_date && plan.end_date >= startDate) {
    return plan.end_date;
  }

  return addMonths(startDate, 12);
}

async function ensureCustomer(customerId) {
  const customer = await findCustomerById(customerId);

  if (!customer) {
    throw new ApiError(400, 'The selected customer does not exist.');
  }

  if (customer.status === 'ARCHIVED') {
    throw new ApiError(400, 'Archived customers cannot receive new subscriptions.');
  }

  return customer;
}

async function ensurePlan(planId, connection) {
  const plan = await findPlanById(planId, connection);

  if (!plan) {
    throw new ApiError(400, 'The selected plan does not exist.');
  }

  if (plan.status !== 'ACTIVE') {
    throw new ApiError(400, 'Only active plans can be used for subscriptions.');
  }

  return plan;
}

export async function listSubscriptionRecords(query) {
  const pagination = parsePagination(query, {
    allowedSortFields: [
      'subscription_number',
      'customer_name',
      'plan_name',
      'status',
      'start_date',
      'expiry_date',
      'next_billing_date',
      'total_amount',
      'created_at',
    ],
    defaultSortBy: 'created_at',
  });
  const result = await listSubscriptions({ ...query, ...pagination });

  return {
    rows: result.rows,
    meta: paginationMeta({ ...pagination, total: result.total }),
  };
}

export async function getSubscription(subscriptionId) {
  const subscription = await findSubscriptionById(subscriptionId);

  if (!subscription) {
    throw new ApiError(404, 'Subscription not found.');
  }

  return subscription;
}

export async function createSubscriptionRecord(payload, context = {}) {
  const customer = await ensureCustomer(payload.customerId);
  const startDate = payload.startDate;

  const subscriptionId = await withTransaction(async (connection) => {
    const plan = await ensurePlan(payload.planId, connection);
    const expiryDate =
      payload.expiryDate ?? defaultExpiryDate(startDate, plan);

    if (expiryDate < startDate) {
      throw new ApiError(400, 'Expiry date cannot be before the start date.');
    }

    const { lines, totals } = await priceLines(connection, payload.lines);
    const subscriptionNumber = await nextConfiguredDocumentNumber(connection, {
      type: 'SUBSCRIPTION',
      settingKey: 'subscription_prefix',
      fallbackPrefix: 'SUB',
    });
    const id = await createSubscription(connection, {
      subscriptionNumber,
      customerId: customer.id,
      planId: plan.id,
      quotationId: payload.quotationId ?? null,
      status: payload.status ?? 'DRAFT',
      startDate,
      expiryDate,
      nextBillingDate: payload.nextBillingDate ?? startDate,
      paymentTermsDays: payload.paymentTermsDays ?? 30,
      ...totals,
      currency: payload.currency ?? 'INR',
      notes: payload.notes,
      createdBy: context.actor?.id,
    });

    await insertSubscriptionLines(connection, id, lines);
    await addSubscriptionHistory(connection, {
      subscriptionId: id,
      action: 'CREATED',
      toStatus: payload.status ?? 'DRAFT',
      notes: 'Subscription created.',
      performedBy: context.actor?.id,
    });
    await writeAuditLog({
      userId: context.actor?.id,
      action: 'CREATE',
      entityType: 'SUBSCRIPTION',
      entityId: id,
      details: { subscriptionNumber, customerId: customer.id, planId: plan.id },
      ipAddress: context.ipAddress,
      connection,
    });

    return id;
  });

  return getSubscription(subscriptionId);
}

export async function updateSubscriptionRecord(
  subscriptionId,
  payload,
  context = {},
) {
  const existing = await getSubscription(subscriptionId);

  if (!editableStatuses.has(existing.status)) {
    throw new ApiError(
      400,
      'Only draft or quotation subscriptions can be edited.',
    );
  }

  await withTransaction(async (connection) => {
    const locked = await findSubscriptionForUpdate(connection, subscriptionId);

    if (!locked) {
      throw new ApiError(404, 'Subscription not found.');
    }

    let plan = {
      id: locked.plan_id,
      end_date: locked.plan_end_date,
      status: 'ACTIVE',
    };

    if (payload.planId && payload.planId !== locked.plan_id) {
      plan = await ensurePlan(payload.planId, connection);
    }

    if (payload.customerId && payload.customerId !== locked.customer_id) {
      await ensureCustomer(payload.customerId);
    }

    const startDate = payload.startDate ?? locked.start_date;
    const expiryDate =
      payload.expiryDate ?? defaultExpiryDate(startDate, plan);

    if (expiryDate < startDate) {
      throw new ApiError(400, 'Expiry date cannot be before the start date.');
    }

    const changes = {
      customerId: payload.customerId,
      planId: payload.planId,
      startDate,
      expiryDate,
      nextBillingDate:
        payload.nextBillingDate ??
        (payload.startDate ? startDate : undefined),
      paymentTermsDays: payload.paymentTermsDays,
      notes: payload.notes,
    };

    if (payload.lines) {
      const { lines, totals } = await priceLines(connection, payload.lines);
      Object.assign(changes, totals);
      await replaceSubscriptionLines(connection, subscriptionId, lines);
    }

    await updateSubscription(connection, subscriptionId, changes);
    await addSubscriptionHistory(connection, {
      subscriptionId,
      action: 'UPDATED',
      fromStatus: locked.status,
      toStatus: locked.status,
      notes: 'Subscription details updated.',
      performedBy: context.actor?.id,
    });
    await writeAuditLog({
      userId: context.actor?.id,
      action: 'UPDATE',
      entityType: 'SUBSCRIPTION',
      entityId: subscriptionId,
      details: { changedFields: Object.keys(payload) },
      ipAddress: context.ipAddress,
      connection,
    });
  });

  return getSubscription(subscriptionId);
}

async function transition(subscriptionId, { from, to, action, notes }, context) {
  return withTransaction(async (connection) => {
    const subscription = await findSubscriptionForUpdate(
      connection,
      subscriptionId,
    );

    if (!subscription) {
      throw new ApiError(404, 'Subscription not found.');
    }

    if (!from.includes(subscription.status)) {
      throw new ApiError(
        400,
        `Subscription must be ${from.join(' or ')} before it can be ${to.toLowerCase()}.`,
      );
    }

    const changes = { status: to };

    if (to === 'ACTIVE' && !subscription.next_billing_date) {
      changes.nextBillingDate = subscription.start_date;
    }

    await updateSubscriptionState(connection, subscriptionId, changes);
    await addSubscriptionHistory(connection, {
      subscriptionId,
      action,
      fromStatus: subscription.status,
      toStatus: to,
      notes,
      performedBy: context.actor?.id,
    });
    await writeAuditLog({
      userId: context.actor?.id,
      action,
      entityType: 'SUBSCRIPTION',
      entityId: subscriptionId,
      details: { from: subscription.status, to },
      ipAddress: context.ipAddress,
      connection,
    });

    return subscription;
  });
}

export async function confirmSubscription(subscriptionId, context = {}) {
  await transition(
    subscriptionId,
    {
      from: ['DRAFT', 'QUOTATION'],
      to: 'CONFIRMED',
      action: 'CONFIRMED',
      notes: 'Subscription confirmed.',
    },
    context,
  );
  return getSubscription(subscriptionId);
}

export async function activateSubscription(subscriptionId, context = {}) {
  await transition(
    subscriptionId,
    {
      from: ['DRAFT', 'CONFIRMED'],
      to: 'ACTIVE',
      action: 'ACTIVATED',
      notes: 'Subscription activated and billing started.',
    },
    context,
  );
  return getSubscription(subscriptionId);
}

export async function pauseSubscription(subscriptionId, context = {}) {
  await withTransaction(async (connection) => {
    const subscription = await findSubscriptionForUpdate(
      connection,
      subscriptionId,
    );

    if (!subscription) {
      throw new ApiError(404, 'Subscription not found.');
    }

    if (subscription.status !== 'ACTIVE') {
      throw new ApiError(400, 'Only active subscriptions can be paused.');
    }

    if (!subscription.allow_pause) {
      throw new ApiError(400, 'This plan does not allow pausing.');
    }

    await updateSubscriptionState(connection, subscriptionId, {
      status: 'PAUSED',
      pausedAt: new Date(),
    });
    await addSubscriptionHistory(connection, {
      subscriptionId,
      action: 'PAUSED',
      fromStatus: 'ACTIVE',
      toStatus: 'PAUSED',
      notes: context.notes ?? 'Subscription paused.',
      performedBy: context.actor?.id,
    });
    await writeAuditLog({
      userId: context.actor?.id,
      action: 'PAUSE',
      entityType: 'SUBSCRIPTION',
      entityId: subscriptionId,
      ipAddress: context.ipAddress,
      connection,
    });
  });

  return getSubscription(subscriptionId);
}

export async function resumeSubscription(subscriptionId, context = {}) {
  await withTransaction(async (connection) => {
    const subscription = await findSubscriptionForUpdate(
      connection,
      subscriptionId,
    );

    if (!subscription) {
      throw new ApiError(404, 'Subscription not found.');
    }

    if (subscription.status !== 'PAUSED') {
      throw new ApiError(400, 'Only paused subscriptions can be resumed.');
    }

    const pausedOn = subscription.paused_at
      ? String(subscription.paused_at).slice(0, 10)
      : null;
    const pausedDays = pausedOn
      ? Math.max(0, differenceInDays(pausedOn, todayString()))
      : 0;
    const changes = { status: 'ACTIVE', pausedAt: null };

    if (pausedDays > 0) {
      if (subscription.next_billing_date) {
        changes.nextBillingDate = addDays(
          subscription.next_billing_date,
          pausedDays,
        );
      }

      changes.expiryDate = addDays(subscription.expiry_date, pausedDays);
    }

    await updateSubscriptionState(connection, subscriptionId, changes);
    await addSubscriptionHistory(connection, {
      subscriptionId,
      action: 'RESUMED',
      fromStatus: 'PAUSED',
      toStatus: 'ACTIVE',
      notes:
        pausedDays > 0
          ? `Subscription resumed. Billing dates shifted by ${pausedDays} day(s).`
          : 'Subscription resumed.',
      performedBy: context.actor?.id,
    });
    await writeAuditLog({
      userId: context.actor?.id,
      action: 'RESUME',
      entityType: 'SUBSCRIPTION',
      entityId: subscriptionId,
      ipAddress: context.ipAddress,
      connection,
    });
  });

  return getSubscription(subscriptionId);
}

export async function renewSubscription(subscriptionId, context = {}) {
  await withTransaction(async (connection) => {
    const subscription = await findSubscriptionForUpdate(
      connection,
      subscriptionId,
    );

    if (!subscription) {
      throw new ApiError(404, 'Subscription not found.');
    }

    if (!renewableStatuses.has(subscription.status)) {
      throw new ApiError(
        400,
        'Only active, paused, or closed subscriptions can be renewed.',
      );
    }

    if (!subscription.allow_renewal) {
      throw new ApiError(400, 'This plan does not allow renewal.');
    }

    const today = todayString();
    const baseDate = isAfter(subscription.expiry_date, today)
      ? subscription.expiry_date
      : today;
    const newExpiry = addBillingPeriod(baseDate, subscription.billing_frequency);
    const changes = {
      status: 'ACTIVE',
      expiryDate: newExpiry,
      closedAt: null,
      closeReason: null,
      pausedAt: null,
      nextBillingDate:
        subscription.status === 'CLOSED'
          ? today
          : subscription.next_billing_date &&
              isAfter(subscription.next_billing_date, today)
            ? subscription.next_billing_date
            : today,
    };

    await updateSubscriptionState(connection, subscriptionId, changes);
    await addSubscriptionHistory(connection, {
      subscriptionId,
      action: 'RENEWED',
      fromStatus: subscription.status,
      toStatus: 'ACTIVE',
      notes: `Subscription renewed until ${newExpiry}.`,
      performedBy: context.actor?.id,
    });
    await writeAuditLog({
      userId: context.actor?.id,
      action: 'RENEW',
      entityType: 'SUBSCRIPTION',
      entityId: subscriptionId,
      details: { expiryDate: newExpiry },
      ipAddress: context.ipAddress,
      connection,
    });
  });

  return getSubscription(subscriptionId);
}

export async function closeSubscription(subscriptionId, payload = {}, context = {}) {
  await withTransaction(async (connection) => {
    const subscription = await findSubscriptionForUpdate(
      connection,
      subscriptionId,
    );

    if (!subscription) {
      throw new ApiError(404, 'Subscription not found.');
    }

    if (subscription.status === 'CLOSED') {
      throw new ApiError(400, 'Subscription is already closed.');
    }

    if (!['DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'PAUSED'].includes(subscription.status)) {
      throw new ApiError(400, 'This subscription cannot be closed.');
    }

    if (
      subscription.status === 'ACTIVE' &&
      !subscription.allow_early_closure &&
      isAfter(subscription.expiry_date, todayString())
    ) {
      throw new ApiError(
        400,
        'This plan does not allow early closure before the expiry date.',
      );
    }

    await updateSubscriptionState(connection, subscriptionId, {
      status: 'CLOSED',
      closedAt: new Date(),
      closeReason: payload.reason ?? 'Closed by staff.',
      nextBillingDate: null,
    });
    await addSubscriptionHistory(connection, {
      subscriptionId,
      action: 'CLOSED',
      fromStatus: subscription.status,
      toStatus: 'CLOSED',
      notes: payload.reason ?? 'Subscription closed.',
      performedBy: context.actor?.id,
    });
    await writeAuditLog({
      userId: context.actor?.id,
      action: 'CLOSE',
      entityType: 'SUBSCRIPTION',
      entityId: subscriptionId,
      details: { reason: payload.reason ?? null },
      ipAddress: context.ipAddress,
      connection,
    });
  });

  return getSubscription(subscriptionId);
}

export async function removeSubscription(subscriptionId, context = {}) {
  const existing = await getSubscription(subscriptionId);

  if (!editableStatuses.has(existing.status)) {
    throw new ApiError(
      400,
      'Only draft or quotation subscriptions can be deleted.',
    );
  }

  const dependencies = await subscriptionDependencyCounts(subscriptionId);

  if (Number(dependencies.invoices) > 0) {
    throw new ApiError(
      409,
      'This subscription already has invoices and cannot be deleted.',
    );
  }

  await withTransaction(async (connection) => {
    await deleteSubscription(connection, subscriptionId);
    await writeAuditLog({
      userId: context.actor?.id,
      action: 'DELETE',
      entityType: 'SUBSCRIPTION',
      entityId: subscriptionId,
      ipAddress: context.ipAddress,
      connection,
    });
  });

  return { message: 'Subscription deleted.' };
}

export async function dueSubscriptionRecords(date = todayString()) {
  return findDueSubscriptions(date);
}

/**
 * Creates a confirmed subscription from an accepted quotation inside the
 * caller's transaction. Used by the quotation conversion endpoint.
 */
export async function createSubscriptionFromQuotation(
  connection,
  quotation,
  payload,
  context = {},
) {
  const planLine = quotation.lines.find((line) => line.plan_id);

  if (!planLine) {
    throw new ApiError(
      400,
      'The quotation must include at least one plan before it can be converted.',
    );
  }

  const plan = await findPlanById(planLine.plan_id, connection);

  if (!plan) {
    throw new ApiError(400, 'The plan referenced by the quotation no longer exists.');
  }

  const startDate = payload.startDate ?? todayString();
  const expiryDate =
    payload.expiryDate ?? defaultExpiryDate(startDate, plan);

  if (expiryDate < startDate) {
    throw new ApiError(400, 'Expiry date cannot be before the start date.');
  }

  const subscriptionNumber = await nextConfiguredDocumentNumber(connection, {
    type: 'SUBSCRIPTION',
    settingKey: 'subscription_prefix',
    fallbackPrefix: 'SUB',
  });
  const lines = quotation.lines.map((line, index) => ({
    productId: line.product_id,
    variantId: line.variant_id,
    planId: line.plan_id,
    description: line.description,
    quantity: line.quantity,
    unitPrice: line.unit_price,
    taxRate: line.tax_rate,
    taxAmount: line.tax_amount,
    discountAmount: line.discount_amount,
    lineTotal: line.line_total,
    sortOrder: index,
  }));

  const subscriptionId = await createSubscription(connection, {
    subscriptionNumber,
    customerId: quotation.customer_id,
    planId: plan.id,
    quotationId: quotation.id,
    status: 'CONFIRMED',
    startDate,
    expiryDate,
    nextBillingDate: startDate,
    paymentTermsDays: payload.paymentTermsDays ?? 30,
    subtotal: quotation.subtotal,
    discountAmount: quotation.discount_amount,
    taxAmount: quotation.tax_amount,
    totalAmount: quotation.total_amount,
    currency: quotation.currency,
    notes: payload.notes ?? `Created from quotation ${quotation.quotation_number}.`,
    createdBy: context.actor?.id,
  });

  await insertSubscriptionLines(connection, subscriptionId, lines);
  await addSubscriptionHistory(connection, {
    subscriptionId,
    action: 'CREATED',
    toStatus: 'CONFIRMED',
    notes: `Created from accepted quotation ${quotation.quotation_number}.`,
    performedBy: context.actor?.id,
  });

  return subscriptionId;
}
