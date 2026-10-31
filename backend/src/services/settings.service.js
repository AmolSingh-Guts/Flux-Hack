import { withTransaction } from '../config/database.js';
import {
  getCompanySettings,
  updateCompanySettings,
} from '../models/settings.model.js';
import env from '../config/env.js';
import { mailMode } from '../config/mailer.js';
import { writeAuditLog } from './audit.service.js';

export async function readSettings() {
  const company = await getCompanySettings();

  return {
    company,
    mail: {
      mode: mailMode,
      from: env.mail.from,
    },
    billing: {
      enabled: env.billing.enabled,
      cron: env.billing.cron,
    },
    currency: company?.currency ?? env.currency,
  };
}

export async function saveSettings(payload, context = {}) {
  await withTransaction(async (connection) => {
    await updateCompanySettings(connection, payload);
    await writeAuditLog({
      userId: context.actor?.id,
      action: 'UPDATE',
      entityType: 'SETTINGS',
      details: { changedFields: Object.keys(payload) },
      ipAddress: context.ipAddress,
      connection,
    });
  });

  return readSettings();
}
