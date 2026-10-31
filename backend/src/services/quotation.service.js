import { withTransaction } from '../config/database.js';
import {
  createQuotation,
  expireQuotations,
  findQuotationById,
  findQuotationTemplateById,
  insertQuotationLines,
  listQuotationTemplates,
  listQuotations,
  markQuotationExpiredIfNeeded,
  replaceQuotationLines,
  updateQuotation,
  updateQuotationStatus,
} from '../models/quotation.model.js';
import { findCustomerById } from '../models/customer.model.js';
import { getCompanySettings } from '../models/settings.model.js';
import ApiError from '../utils/ApiError.js';
import { parsePagination, paginationMeta } from '../utils/pagination.utils.js';
import { addDays, todayString } from '../utils/date.utils.js';
import { nextConfiguredDocumentNumber } from './document-number.service.js';
import { priceLines } from './pricing.service.js';
import { generateQuotationPdf } from './pdf.service.js';
import { sendDocumentEmail } from './email.service.js';
import { writeAuditLog } from './audit.service.js';
import { createSubscriptionFromQuotation, getSubscription } from './subscription.service.js';

async function ensureCustomer(customerId) {
  const customer = await findCustomerById(customerId);

  if (!customer) {
    throw new ApiError(400, 'The selected customer does not exist.');
  }

  if (customer.status === 'ARCHIVED') {
    throw new ApiError(400, 'Quotations cannot be created for archived customers.');
  }

  return customer;
}

async function ensureTemplate(templateId) {
  if (!templateId) {
    return null;
  }

  const template = await findQuotationTemplateById(templateId);

  if (!template) {
    throw new ApiError(400, 'The selected quotation template does not exist.');
  }

  return template;
}

export async function listQuotationRecords(query) {
  await expireQuotations();
  const pagination = parsePagination(query, {
    allowedSortFields: [
      'quotation_number',
      'customer_name',
      'status',
      'valid_until',
      'total_amount',
      'created_at',
    ],
    defaultSortBy: 'created_at',
  });
  const result = await listQuotations({ ...query, ...pagination });

  return {
    rows: result.rows,
    meta: paginationMeta({ ...pagination, total: result.total }),
  };
}

export async function getQuotation(quotationId) {
  await markQuotationExpiredIfNeeded(quotationId);
  const quotation = await findQuotationById(quotationId);

  if (!quotation) {
    throw new ApiError(404, 'Quotation not found.');
  }

  return quotation;
}

export async function getQuotationTemplates() {
  return listQuotationTemplates();
}

export async function createQuotationRecord(payload, context = {}) {
  const customer = await ensureCustomer(payload.customerId);
  await ensureTemplate(payload.templateId);

  const quotationId = await withTransaction(async (connection) => {
    const { lines, totals } = await priceLines(connection, payload.lines);
    const quotationNumber = await nextConfiguredDocumentNumber(connection, {
      type: 'QUOTATION',
      settingKey: 'quotation_prefix',
      fallbackPrefix: 'QUO',
    });
    const id = await createQuotation(connection, {
      quotationNumber,
      customerId: customer.id,
      templateId: payload.templateId ?? null,
      status: 'DRAFT',
      validityDays: payload.validityDays,
      validUntil: addDays(todayString(), payload.validityDays),
      ...totals,
      currency: 'INR',
      notes: payload.notes,
      createdBy: context.actor?.id,
    });

    await insertQuotationLines(connection, id, lines);
    await writeAuditLog({
      userId: context.actor?.id,
      action: 'CREATE',
      entityType: 'QUOTATION',
      entityId: id,
      details: { quotationNumber, customerId: customer.id },
      ipAddress: context.ipAddress,
      connection,
    });

    return id;
  });

  return getQuotation(quotationId);
}

export async function updateQuotationRecord(quotationId, payload, context = {}) {
  const existing = await getQuotation(quotationId);

  if (existing.status !== 'DRAFT') {
    throw new ApiError(400, 'Only draft quotations can be edited.');
  }

  if (payload.customerId && payload.customerId !== existing.customer_id) {
    await ensureCustomer(payload.customerId);
  }

  if (payload.templateId !== undefined) {
    await ensureTemplate(payload.templateId);
  }

  await withTransaction(async (connection) => {
    const changes = {
      customerId: payload.customerId,
      templateId: payload.templateId,
      validityDays: payload.validityDays,
      validUntil:
        payload.validityDays !== undefined
          ? addDays(todayString(), payload.validityDays)
          : undefined,
      notes: payload.notes,
    };

    if (payload.lines) {
      const { lines, totals } = await priceLines(connection, payload.lines);
      Object.assign(changes, totals);
      await replaceQuotationLines(connection, quotationId, lines);
    }

    await updateQuotation(connection, quotationId, changes);
    await writeAuditLog({
      userId: context.actor?.id,
      action: 'UPDATE',
      entityType: 'QUOTATION',
      entityId: quotationId,
      details: { changedFields: Object.keys(payload) },
      ipAddress: context.ipAddress,
      connection,
    });
  });

  return getQuotation(quotationId);
}

export async function deleteQuotation(quotationId, context = {}) {
  const quotation = await getQuotation(quotationId);

  if (!['DRAFT', 'REJECTED', 'EXPIRED'].includes(quotation.status)) {
    throw new ApiError(
      400,
      'Only draft, rejected, or expired quotations can be deleted.',
    );
  }

  await withTransaction(async (connection) => {
    await connection.query('DELETE FROM quotations WHERE id = ?', [quotationId]);
    await writeAuditLog({
      userId: context.actor?.id,
      action: 'DELETE',
      entityType: 'QUOTATION',
      entityId: quotationId,
      ipAddress: context.ipAddress,
      connection,
    });
  });

  return { message: 'Quotation deleted.' };
}

export async function quotationPdf(quotationId) {
  const quotation = await getQuotation(quotationId);
  const company = await getCompanySettings();
  const buffer = await generateQuotationPdf(quotation, company);

  return {
    buffer,
    filename: `${quotation.quotation_number}.pdf`,
    quotation,
  };
}

export async function sendQuotationEmail(quotationId, payload = {}, context = {}) {
  const quotation = await getQuotation(quotationId);

  if (['ACCEPTED', 'REJECTED', 'EXPIRED'].includes(quotation.status)) {
    throw new ApiError(
      400,
      'Closed or expired quotations cannot be emailed again.',
    );
  }

  const company = await getCompanySettings();
  const buffer = await generateQuotationPdf(quotation, company);
  const message =
    payload.message ||
    `Please find quotation ${quotation.quotation_number} attached. It is valid until ${quotation.valid_until}.`;

  await sendDocumentEmail({
    to: quotation.customer_email,
    customerName: quotation.customer_name,
    subject: `Quotation ${quotation.quotation_number} from ${company.company_name}`,
    message,
    documentLabel: 'quotation',
    attachment: {
      filename: `${quotation.quotation_number}.pdf`,
      content: buffer,
      contentType: 'application/pdf',
    },
  });

  await withTransaction(async (connection) => {
    await updateQuotationStatus(connection, quotationId, 'SENT', {
      sentAt: new Date(),
    });
    await writeAuditLog({
      userId: context.actor?.id,
      action: 'SEND',
      entityType: 'QUOTATION',
      entityId: quotationId,
      details: { to: quotation.customer_email },
      ipAddress: context.ipAddress,
      connection,
    });
  });

  return getQuotation(quotationId);
}

export async function changeQuotationStatus(
  quotationId,
  status,
  context = {},
) {
  const quotation = await getQuotation(quotationId);

  if (quotation.status === 'EXPIRED') {
    throw new ApiError(400, 'Expired quotations cannot be changed.');
  }

  if (status === 'SENT' && !['DRAFT', 'SENT'].includes(quotation.status)) {
    throw new ApiError(400, 'Only draft quotations can be marked as sent.');
  }

  if (
    ['ACCEPTED', 'REJECTED'].includes(status) &&
    !['DRAFT', 'SENT'].includes(quotation.status)
  ) {
    throw new ApiError(
      400,
      'Only draft or sent quotations can be accepted or rejected.',
    );
  }

  await withTransaction(async (connection) => {
    const timestamps = {};

    if (status === 'SENT') {
      timestamps.sentAt = new Date();
    }

    if (status === 'ACCEPTED') {
      timestamps.acceptedAt = new Date();
    }

    if (status === 'REJECTED') {
      timestamps.rejectedAt = new Date();
    }

    await updateQuotationStatus(connection, quotationId, status, timestamps);
    await writeAuditLog({
      userId: context.actor?.id,
      action: `STATUS_${status}`,
      entityType: 'QUOTATION',
      entityId: quotationId,
      details: { from: quotation.status, to: status },
      ipAddress: context.ipAddress,
      connection,
    });
  });

  return getQuotation(quotationId);
}

export async function convertQuotation(
  quotationId,
  payload,
  context = {},
) {
  const quotation = await getQuotation(quotationId);

  if (quotation.status !== 'ACCEPTED') {
    throw new ApiError(
      400,
      'Only accepted quotations can be converted into subscriptions.',
    );
  }

  if (quotation.subscription_id) {
    throw new ApiError(
      409,
      `This quotation has already been converted to subscription ${quotation.subscription_number}.`,
    );
  }

  const subscriptionId = await withTransaction(async (connection) => {
    const freshQuotation = await findQuotationById(quotationId, connection);

    if (freshQuotation.subscription_id) {
      throw new ApiError(409, 'This quotation has already been converted.');
    }

    const id = await createSubscriptionFromQuotation(
      connection,
      freshQuotation,
      payload,
      context,
    );

    await writeAuditLog({
      userId: context.actor?.id,
      action: 'CONVERT',
      entityType: 'QUOTATION',
      entityId: quotationId,
      details: { subscriptionId: id },
      ipAddress: context.ipAddress,
      connection,
    });

    return id;
  });

  return {
    subscription: await getSubscription(subscriptionId),
    message: 'Quotation converted into a subscription.',
  };
}
