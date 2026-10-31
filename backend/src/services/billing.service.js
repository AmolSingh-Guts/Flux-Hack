import pool, { withTransaction } from '../config/database.js';
import {
  addSubscriptionHistory,
  findDueSubscriptions,
  updateSubscriptionState,
} from '../models/subscription.model.js';
import { isAfter, todayString } from '../utils/date.utils.js';
import { createSubscriptionInvoiceInTransaction } from './invoice.service.js';

async function writeBillingLog(entry, connection = pool) {
  await connection.query(
    `INSERT INTO billing_logs (subscription_id, invoice_id, status, message, details)
     VALUES (?, ?, ?, ?, ?)`,
    [
      entry.subscriptionId ?? null,
      entry.invoiceId ?? null,
      entry.status,
      entry.message.slice(0, 500),
      entry.details ? JSON.stringify(entry.details) : null,
    ],
  );
}

export async function runBillingCycle({ date = todayString(), actorId = null } = {}) {
  const subscriptions = await findDueSubscriptions(date);
  const summary = {
    date,
    scanned: subscriptions.length,
    generated: [],
    skipped: [],
    errors: [],
  };

  for (const subscription of subscriptions) {
    try {
      if (
        subscription.next_billing_date &&
        isAfter(subscription.next_billing_date, subscription.expiry_date)
      ) {
        await withTransaction(async (connection) => {
          await updateSubscriptionState(connection, subscription.id, {
            status: 'CLOSED',
            closedAt: new Date(),
            closeReason: 'Subscription reached its expiry date before the next billing cycle.',
            nextBillingDate: null,
          });
          await addSubscriptionHistory(connection, {
            subscriptionId: subscription.id,
            action: 'AUTO_CLOSED',
            fromStatus: 'ACTIVE',
            toStatus: 'CLOSED',
            notes: 'Closed automatically because the subscription expired before its next billing date.',
            performedBy: actorId,
          });
          await writeBillingLog(
            {
              subscriptionId: subscription.id,
              status: 'SKIPPED',
              message: `Subscription ${subscription.subscription_number} expired on ${subscription.expiry_date}.`,
            },
            connection,
          );
        });

        summary.skipped.push({
          subscriptionId: subscription.id,
          subscriptionNumber: subscription.subscription_number,
          reason: 'Expired before next billing date; subscription closed.',
        });
        continue;
      }

      const result = await withTransaction(async (connection) => {
        const invoice = await createSubscriptionInvoiceInTransaction(
          connection,
          subscription.id,
          {},
          { actor: { id: actorId } },
        );

        await writeBillingLog(
          {
            subscriptionId: subscription.id,
            invoiceId: invoice.invoiceId,
            status: 'SUCCESS',
            message: `Invoice ${invoice.invoiceNumber} generated for ${invoice.billingPeriodStart} to ${invoice.billingPeriodEnd}.`,
            details: {
              invoiceNumber: invoice.invoiceNumber,
              nextBillingDate: invoice.nextBillingDate,
              autoClosed: invoice.autoClosed,
            },
          },
          connection,
        );

        return invoice;
      });

      summary.generated.push({
        subscriptionId: subscription.id,
        subscriptionNumber: subscription.subscription_number,
        invoiceId: result.invoiceId,
        invoiceNumber: result.invoiceNumber,
        billingPeriodStart: result.billingPeriodStart,
        billingPeriodEnd: result.billingPeriodEnd,
        autoClosed: result.autoClosed,
      });
    } catch (error) {
      const isBusinessRule = [400, 404, 409].includes(error.statusCode);

      await writeBillingLog({
        subscriptionId: subscription.id,
        status: isBusinessRule ? 'SKIPPED' : 'ERROR',
        message: error.message ?? 'Unknown billing error.',
        details: {
          code: error.code ?? null,
          statusCode: error.statusCode ?? null,
        },
      }).catch((logError) => {
        console.error('[billing] Failed to write billing log:', logError.message);
      });

      if (isBusinessRule) {
        summary.skipped.push({
          subscriptionId: subscription.id,
          subscriptionNumber: subscription.subscription_number,
          reason: error.message,
        });
      } else {
        console.error(
          `[billing] Subscription ${subscription.subscription_number} failed:`,
          error,
        );
        summary.errors.push({
          subscriptionId: subscription.id,
          subscriptionNumber: subscription.subscription_number,
          reason: error.message,
        });
      }
    }
  }

  return summary;
}

export async function listBillingLogs({ status, subscriptionId, page, limit, offset }) {
  const conditions = ['1 = 1'];
  const parameters = [];

  if (status) {
    conditions.push('bl.status = ?');
    parameters.push(status);
  }

  if (subscriptionId) {
    conditions.push('bl.subscription_id = ?');
    parameters.push(subscriptionId);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const [[countRow]] = await pool.query(
    `SELECT COUNT(*) AS total FROM billing_logs bl ${where}`,
    parameters,
  );
  const [rows] = await pool.query(
    `SELECT bl.*, s.subscription_number, i.invoice_number
     FROM billing_logs bl
     LEFT JOIN subscriptions s ON s.id = bl.subscription_id
     LEFT JOIN invoices i ON i.id = bl.invoice_id
     ${where}
     ORDER BY bl.created_at DESC, bl.id DESC
     LIMIT ? OFFSET ?`,
    [...parameters, limit, offset],
  );

  return { rows, total: countRow.total };
}
