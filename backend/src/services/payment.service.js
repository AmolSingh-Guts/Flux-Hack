import { withTransaction } from '../config/database.js';
import {
  createPayment,
  createPaymentTransaction,
  findPaymentById,
  findPaymentForUpdate,
  listPayments,
  voidPayment,
} from '../models/payment.model.js';
import {
  findInvoiceForUpdate,
  paymentTotalsForInvoice,
} from '../models/invoice.model.js';
import { getCompanySettings } from '../models/settings.model.js';
import ApiError from '../utils/ApiError.js';
import { parsePagination, paginationMeta } from '../utils/pagination.utils.js';
import { todayString } from '../utils/date.utils.js';
import { roundMoney } from '../utils/money.utils.js';
import { nextConfiguredDocumentNumber } from './document-number.service.js';
import { recalculateInvoiceStatus } from './invoice.service.js';
import { generateReceiptPdf } from './pdf.service.js';
import { sendDocumentEmail } from './email.service.js';
import { writeAuditLog } from './audit.service.js';

const referenceRequiredMethods = new Set(['BANK_TRANSFER', 'UPI', 'CARD']);

export async function listPaymentRecords(query) {
  const pagination = parsePagination(query, {
    allowedSortFields: [
      'payment_number',
      'customer_name',
      'amount',
      'payment_date',
      'payment_method',
      'created_at',
    ],
    defaultSortBy: 'payment_date',
  });
  const result = await listPayments({ ...query, ...pagination });

  return {
    rows: result.rows,
    meta: paginationMeta({ ...pagination, total: result.total }),
  };
}

export async function getPayment(paymentId) {
  const payment = await findPaymentById(paymentId);

  if (!payment) {
    throw new ApiError(404, 'Payment not found.');
  }

  return payment;
}

export async function createPaymentRecord(payload, context = {}) {
  if (
    referenceRequiredMethods.has(payload.paymentMethod) &&
    !payload.transactionReference
  ) {
    throw new ApiError(
      400,
      'A transaction reference is required for bank transfers, UPI, and card payments.',
    );
  }

  const amount = roundMoney(payload.amount);

  const paymentId = await withTransaction(async (connection) => {
    const invoice = await findInvoiceForUpdate(connection, payload.invoiceId);

    if (!invoice) {
      throw new ApiError(404, 'Invoice not found.');
    }

    if (invoice.status === 'DRAFT') {
      throw new ApiError(
        400,
        'Confirm the invoice before recording a payment against it.',
      );
    }

    if (invoice.status === 'CANCELLED') {
      throw new ApiError(400, 'Payments cannot be recorded against a cancelled invoice.');
    }

    const alreadyPaid = roundMoney(
      await paymentTotalsForInvoice(connection, invoice.id),
    );
    const outstanding = roundMoney(
      Math.max(0, Number(invoice.total_amount) - alreadyPaid),
    );

    if (outstanding <= 0) {
      throw new ApiError(400, 'This invoice is already fully paid.');
    }

    if (amount > outstanding + 0.005) {
      throw new ApiError(
        400,
        `Payment exceeds the outstanding balance of ${outstanding.toFixed(2)}.`,
      );
    }

    const paymentNumber = await nextConfiguredDocumentNumber(connection, {
      type: 'PAYMENT',
      settingKey: 'payment_prefix',
      fallbackPrefix: 'PAY',
      date: new Date(`${payload.paymentDate ?? todayString()}T00:00:00.000Z`),
    });

    const id = await createPayment(connection, {
      paymentNumber,
      invoiceId: invoice.id,
      customerId: invoice.customer_id,
      paymentMethod: payload.paymentMethod,
      amount,
      paymentDate: payload.paymentDate ?? todayString(),
      transactionReference: payload.transactionReference,
      notes: payload.notes,
      recordedBy: context.actor?.id,
    });

    await createPaymentTransaction(connection, {
      paymentId: id,
      transactionReference: payload.transactionReference,
      amount,
      status: 'VERIFIED',
      provider: 'MANUAL',
      metadata: {
        recordedBy: context.actor?.id ?? null,
        invoiceNumber: invoice.invoice_number,
        verification: 'manual-entry',
      },
      verifiedAt: new Date(),
    });

    await recalculateInvoiceStatus(connection, invoice.id);
    await writeAuditLog({
      userId: context.actor?.id,
      action: 'CREATE',
      entityType: 'PAYMENT',
      entityId: id,
      details: {
        paymentNumber,
        invoiceId: invoice.id,
        amount,
        method: payload.paymentMethod,
      },
      ipAddress: context.ipAddress,
      connection,
    });

    return id;
  });

  return getPayment(paymentId);
}

export async function voidPaymentRecord(paymentId, context = {}) {
  await withTransaction(async (connection) => {
    const payment = await findPaymentForUpdate(connection, paymentId);

    if (!payment) {
      throw new ApiError(404, 'Payment not found.');
    }

    if (payment.status === 'VOID') {
      throw new ApiError(400, 'Payment has already been voided.');
    }

    await voidPayment(connection, paymentId);
    await createPaymentTransaction(connection, {
      paymentId,
      transactionReference: payment.transaction_reference,
      amount: -Number(payment.amount),
      status: 'FAILED',
      provider: 'MANUAL',
      metadata: {
        voided: true,
        voidedBy: context.actor?.id ?? null,
      },
      verifiedAt: null,
    });
    await recalculateInvoiceStatus(connection, payment.invoice_id);
    await writeAuditLog({
      userId: context.actor?.id,
      action: 'VOID',
      entityType: 'PAYMENT',
      entityId: paymentId,
      details: { invoiceId: payment.invoice_id, amount: payment.amount },
      ipAddress: context.ipAddress,
      connection,
    });
  });

  return getPayment(paymentId);
}

export async function paymentReceipt(paymentId) {
  const payment = await getPayment(paymentId);
  const company = await getCompanySettings();
  const buffer = await generateReceiptPdf(payment, company);

  return {
    buffer,
    filename: `${payment.payment_number}-receipt.pdf`,
    payment,
  };
}

export async function sendPaymentReceipt(paymentId, payload = {}, context = {}) {
  const payment = await getPayment(paymentId);
  const company = await getCompanySettings();
  const buffer = await generateReceiptPdf(payment, company);
  const message =
    payload.message ||
    `Thank you. We have received ${payment.amount} ${payment.currency} against invoice ${payment.invoice_number}.`;

  await sendDocumentEmail({
    to: payment.customer_email,
    customerName: payment.customer_name,
    subject: `Payment receipt ${payment.payment_number} from ${company.company_name}`,
    message,
    documentLabel: 'payment receipt',
    attachment: {
      filename: `${payment.payment_number}-receipt.pdf`,
      content: buffer,
      contentType: 'application/pdf',
    },
  });

  await writeAuditLog({
    userId: context.actor?.id,
    action: 'SEND_RECEIPT',
    entityType: 'PAYMENT',
    entityId: paymentId,
    details: { to: payment.customer_email },
    ipAddress: context.ipAddress,
  });

  return payment;
}
