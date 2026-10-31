import { withTransaction } from '../config/database.js';
import {
  createTaxRule,
  deleteTaxRule,
  findTaxRuleById,
  listAllActiveTaxes,
  listTaxRules,
  updateTaxRule,
} from '../models/tax.model.js';
import ApiError from '../utils/ApiError.js';
import { parsePagination, paginationMeta } from '../utils/pagination.utils.js';
import { writeAuditLog } from './audit.service.js';

export async function listTaxes(query) {
  const pagination = parsePagination(query, {
    allowedSortFields: [
      'name',
      'percentage',
      'tax_type',
      'is_active',
      'created_at',
    ],
    defaultSortBy: 'created_at',
  });
  const result = await listTaxRules({ ...query, ...pagination });

  return {
    rows: result.rows,
    meta: paginationMeta({ ...pagination, total: result.total }),
  };
}

export async function getActiveTaxes() {
  return listAllActiveTaxes();
}

export async function getTax(taxId) {
  const tax = await findTaxRuleById(taxId);

  if (!tax) {
    throw new ApiError(404, 'Tax rule not found.');
  }

  return tax;
}

export async function createTax(payload, context = {}) {
  const taxId = await withTransaction(async (connection) => {
    const id = await createTaxRule(connection, payload);
    await writeAuditLog({
      userId: context.actor?.id,
      action: 'CREATE',
      entityType: 'TAX_RULE',
      entityId: id,
      details: { name: payload.name, percentage: payload.percentage },
      ipAddress: context.ipAddress,
      connection,
    });
    return id;
  });

  return getTax(taxId);
}

export async function updateTax(taxId, payload, context = {}) {
  await getTax(taxId);

  await withTransaction(async (connection) => {
    await updateTaxRule(connection, taxId, payload);
    await writeAuditLog({
      userId: context.actor?.id,
      action: 'UPDATE',
      entityType: 'TAX_RULE',
      entityId: taxId,
      details: { changedFields: Object.keys(payload) },
      ipAddress: context.ipAddress,
      connection,
    });
  });

  return getTax(taxId);
}

export async function removeTax(taxId, context = {}) {
  await getTax(taxId);

  await withTransaction(async (connection) => {
    await deleteTaxRule(connection, taxId);
    await writeAuditLog({
      userId: context.actor?.id,
      action: 'DELETE',
      entityType: 'TAX_RULE',
      entityId: taxId,
      ipAddress: context.ipAddress,
      connection,
    });
  });

  return { message: 'Tax rule deleted.' };
}
