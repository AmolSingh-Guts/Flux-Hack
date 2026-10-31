import { withTransaction } from '../config/database.js';
import {
  createDiscount,
  deleteDiscount,
  discountUsageCount,
  findDiscountById,
  listDiscounts,
  syncDiscountRelations,
  updateDiscount,
} from '../models/discount.model.js';
import ApiError from '../utils/ApiError.js';
import { parsePagination, paginationMeta } from '../utils/pagination.utils.js';
import { writeAuditLog } from './audit.service.js';

export async function listDiscountRecords(query) {
  const pagination = parsePagination(query, {
    allowedSortFields: [
      'name',
      'discount_type',
      'discount_value',
      'start_date',
      'end_date',
      'is_active',
      'created_at',
    ],
    defaultSortBy: 'created_at',
  });
  const result = await listDiscounts({ ...query, ...pagination });

  return {
    rows: result.rows,
    meta: paginationMeta({ ...pagination, total: result.total }),
  };
}

export async function getDiscount(discountId) {
  const discount = await findDiscountById(discountId);

  if (!discount) {
    throw new ApiError(404, 'Discount not found.');
  }

  return discount;
}

export async function createDiscountRecord(payload, context = {}) {
  const discountId = await withTransaction(async (connection) => {
    const id = await createDiscount(connection, payload, context.actor?.id);
    await syncDiscountRelations(connection, id, payload);
    await writeAuditLog({
      userId: context.actor?.id,
      action: 'CREATE',
      entityType: 'DISCOUNT',
      entityId: id,
      details: { name: payload.name, scope: payload.scope },
      ipAddress: context.ipAddress,
      connection,
    });
    return id;
  });

  return getDiscount(discountId);
}

export async function updateDiscountRecord(discountId, payload, context = {}) {
  const existing = await getDiscount(discountId);

  await withTransaction(async (connection) => {
    await updateDiscount(connection, discountId, payload);

    if (
      payload.scope !== undefined ||
      payload.productIds !== undefined ||
      payload.subscriptionIds !== undefined
    ) {
      await syncDiscountRelations(connection, discountId, {
        scope: payload.scope ?? existing.scope,
        productIds: payload.productIds ?? existing.product_ids,
        subscriptionIds:
          payload.subscriptionIds ?? existing.subscription_ids,
      });
    }

    await writeAuditLog({
      userId: context.actor?.id,
      action: 'UPDATE',
      entityType: 'DISCOUNT',
      entityId: discountId,
      details: { changedFields: Object.keys(payload) },
      ipAddress: context.ipAddress,
      connection,
    });
  });

  return getDiscount(discountId);
}

export async function removeDiscount(discountId, context = {}) {
  await getDiscount(discountId);
  const usages = await discountUsageCount(discountId);

  if (usages > 0) {
    throw new ApiError(
      409,
      'This discount has been used on invoices and cannot be deleted. Deactivate it instead.',
    );
  }

  await withTransaction(async (connection) => {
    await deleteDiscount(connection, discountId);
    await writeAuditLog({
      userId: context.actor?.id,
      action: 'DELETE',
      entityType: 'DISCOUNT',
      entityId: discountId,
      ipAddress: context.ipAddress,
      connection,
    });
  });

  return { message: 'Discount deleted.' };
}
