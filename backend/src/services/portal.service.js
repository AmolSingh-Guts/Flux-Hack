import {
  findCustomerById,
  updateCustomerProfile,
} from '../models/customer.model.js';
import { findUserById, updateUserProfile } from '../models/user.model.js';
import {
  findSubscriptionForCustomer,
  findSubscriptionsForCustomer,
} from '../models/subscription.model.js';
import {
  findInvoiceById,
  listInvoices,
  markOverdueInvoices,
} from '../models/invoice.model.js';
import {
  findPaymentById,
  listPayments,
} from '../models/payment.model.js';
import { getCompanySettings } from '../models/settings.model.js';
import ApiError from '../utils/ApiError.js';
import { parsePagination, paginationMeta } from '../utils/pagination.utils.js';
import { generateInvoicePdf, generateReceiptPdf } from './pdf.service.js';
import {
  closeSubscription,
  pauseSubscription,
  resumeSubscription,
} from './subscription.service.js';
import { writeAuditLog } from './audit.service.js';

export async function getPortalProfile(user) {
  const [customer, account] = await Promise.all([
    findCustomerById(user.customer_id),
    findUserById(user.id),
  ]);

  if (!customer) {
    throw new ApiError(404, 'Customer profile not found.');
  }

  return {
    customer,
    account: {
      id: account.id,
      name: account.name,
      email: account.email,
      role: account.role,
      lastLoginAt: account.last_login_at,
      createdAt: account.created_at,
    },
  };
}

export async function updatePortalProfile(user, payload, context = {}) {
  const customer = await findCustomerById(user.customer_id);

  if (!customer) {
    throw new ApiError(404, 'Customer profile not found.');
  }

  await updateCustomerProfile(user.customer_id, payload);

  if (payload.name) {
    await updateUserProfile(user.id, { name: payload.name });
  }

  await writeAuditLog({
    userId: user.id,
    action: 'UPDATE_PROFILE',
    entityType: 'CUSTOMER',
    entityId: user.customer_id,
    details: { changedFields: Object.keys(payload) },
    ipAddress: context.ipAddress,
  });

  return getPortalProfile(user);
}

export async function portalSubscriptions(user) {
  return findSubscriptionsForCustomer(user.customer_id);
}

export async function portalSubscription(user, subscriptionId) {
  const subscription = await findSubscriptionForCustomer(
    subscriptionId,
    user.customer_id,
  );

  if (!subscription) {
    throw new ApiError(404, 'Subscription not found.');
  }

  return subscription;
}

export async function portalInvoices(user, query) {
  await markOverdueInvoices();
  const pagination = parsePagination(query, {
    allowedSortFields: ['invoice_number', 'invoice_date', 'due_date', 'total_amount', 'balance_due'],
    defaultSortBy: 'invoice_date',
  });
  const result = await listInvoices({
    ...query,
    ...pagination,
    customerId: user.customer_id,
  });

  return {
    rows: result.rows,
    meta: paginationMeta({ ...pagination, total: result.total }),
  };
}

export async function portalInvoice(user, invoiceId) {
  const invoice = await findInvoiceById(invoiceId);

  if (!invoice || String(invoice.customer_id) !== String(user.customer_id)) {
    throw new ApiError(404, 'Invoice not found.');
  }

  return invoice;
}

export async function portalInvoicePdf(user, invoiceId) {
  const invoice = await portalInvoice(user, invoiceId);
  const company = await getCompanySettings();
  const buffer = await generateInvoicePdf(invoice, company);

  return { buffer, filename: `${invoice.invoice_number}.pdf`, invoice };
}

export async function portalPayments(user, query) {
  const pagination = parsePagination(query, {
    allowedSortFields: ['payment_number', 'payment_date', 'amount'],
    defaultSortBy: 'payment_date',
  });
  const result = await listPayments({
    ...query,
    ...pagination,
    customerId: user.customer_id,
  });

  return {
    rows: result.rows,
    meta: paginationMeta({ ...pagination, total: result.total }),
  };
}

export async function portalPayment(user, paymentId) {
  const payment = await findPaymentById(paymentId);

  if (!payment || String(payment.customer_id) !== String(user.customer_id)) {
    throw new ApiError(404, 'Payment not found.');
  }

  return payment;
}

export async function portalPaymentReceipt(user, paymentId) {
  const payment = await portalPayment(user, paymentId);
  const company = await getCompanySettings();
  const buffer = await generateReceiptPdf(payment, company);

  return {
    buffer,
    filename: `${payment.payment_number}-receipt.pdf`,
    payment,
  };
}

async function verifySubscriptionAction(user, subscriptionId) {
  const subscription = await findSubscriptionForCustomer(
    subscriptionId,
    user.customer_id,
  );

  if (!subscription) {
    throw new ApiError(404, 'Subscription not found.');
  }

  return subscription;
}

export async function portalPauseSubscription(user, subscriptionId, context = {}) {
  const subscription = await verifySubscriptionAction(user, subscriptionId);

  if (!subscription.allow_pause) {
    throw new ApiError(400, 'This subscription does not allow pausing.');
  }

  return pauseSubscription(subscriptionId, {
    actor: user,
    ipAddress: context.ipAddress,
    notes: 'Pause requested from the customer portal.',
  });
}

export async function portalResumeSubscription(user, subscriptionId, context = {}) {
  await verifySubscriptionAction(user, subscriptionId);

  return resumeSubscription(subscriptionId, {
    actor: user,
    ipAddress: context.ipAddress,
  });
}

export async function portalCloseSubscription(
  user,
  subscriptionId,
  payload = {},
  context = {},
) {
  const subscription = await verifySubscriptionAction(user, subscriptionId);

  if (!subscription.allow_early_closure) {
    throw new ApiError(
      400,
      'This subscription cannot be closed early. Please contact support.',
    );
  }

  return closeSubscription(
    subscriptionId,
    { reason: payload.reason || 'Closure requested from the customer portal.' },
    { actor: user, ipAddress: context.ipAddress },
  );
}
