import { withTransaction } from '../config/database.js';
import {
  createPlan,
  deletePlan,
  findCurrentPlanPrice,
  findPlanById,
  findPlansForSelect,
  listPlans,
  planDependencyCounts,
  setPlanPrice,
  updatePlan,
} from '../models/plan.model.js';
import { findProductById } from '../models/product.model.js';
import ApiError from '../utils/ApiError.js';
import { parsePagination, paginationMeta } from '../utils/pagination.utils.js';
import { writeAuditLog } from './audit.service.js';

function validatePlanDates(payload) {
  if (payload.endDate && payload.endDate < payload.startDate) {
    throw new ApiError(400, 'Plan end date cannot be before its start date.');
  }
}

export async function listPlanRecords(query) {
  const pagination = parsePagination(query, {
    allowedSortFields: [
      'name',
      'product_name',
      'billing_frequency',
      'price',
      'status',
      'created_at',
    ],
    defaultSortBy: 'created_at',
  });
  const result = await listPlans({ ...query, ...pagination });

  return {
    rows: result.rows,
    meta: paginationMeta({ ...pagination, total: result.total }),
  };
}

export async function getPlan(planId) {
  const plan = await findPlanById(planId);

  if (!plan) {
    throw new ApiError(404, 'Plan not found.');
  }

  return plan;
}

export async function getPlanOptions(search) {
  return findPlansForSelect(search);
}

export async function createPlanRecord(payload, context = {}) {
  validatePlanDates(payload);
  const product = await findProductById(payload.productId);

  if (!product) {
    throw new ApiError(400, 'The selected product does not exist.');
  }

  if (product.status !== 'ACTIVE') {
    throw new ApiError(400, 'Plans can only be created for active products.');
  }

  const planId = await withTransaction(async (connection) => {
    const id = await createPlan(connection, payload);
    await setPlanPrice(connection, id, payload.price);
    await writeAuditLog({
      userId: context.actor?.id,
      action: 'CREATE',
      entityType: 'PLAN',
      entityId: id,
      details: { name: payload.name, price: payload.price },
      ipAddress: context.ipAddress,
      connection,
    });
    return id;
  });

  return getPlan(planId);
}

export async function updatePlanRecord(planId, payload, context = {}) {
  const existing = await getPlan(planId);
  validatePlanDates({
    startDate: payload.startDate ?? existing.start_date,
    endDate: payload.endDate ?? existing.end_date,
  });

  if (payload.productId && payload.productId !== existing.product_id) {
    const product = await findProductById(payload.productId);

    if (!product || product.status !== 'ACTIVE') {
      throw new ApiError(400, 'The selected product is not active.');
    }
  }

  await withTransaction(async (connection) => {
    await updatePlan(connection, planId, payload);

    if (payload.price !== undefined) {
      await setPlanPrice(connection, planId, payload.price);
    }

    await writeAuditLog({
      userId: context.actor?.id,
      action: 'UPDATE',
      entityType: 'PLAN',
      entityId: planId,
      details: { changedFields: Object.keys(payload) },
      ipAddress: context.ipAddress,
      connection,
    });
  });

  return getPlan(planId);
}

export async function setPlanStatus(planId, status, context = {}) {
  return updatePlanRecord(planId, { status }, context);
}

export async function removePlan(planId, context = {}) {
  await getPlan(planId);
  const dependencies = await planDependencyCounts(planId);

  if (Number(dependencies.subscriptions) > 0) {
    throw new ApiError(
      409,
      'This plan has subscriptions and cannot be deleted. Deactivate it instead.',
    );
  }

  await withTransaction(async (connection) => {
    await deletePlan(connection, planId);
    await writeAuditLog({
      userId: context.actor?.id,
      action: 'DELETE',
      entityType: 'PLAN',
      entityId: planId,
      ipAddress: context.ipAddress,
      connection,
    });
  });

  return { message: 'Plan deleted.' };
}

export async function currentPlanPrice(planId) {
  const price = await findCurrentPlanPrice(planId);

  if (!price) {
    throw new ApiError(400, 'The selected plan does not have an active price.');
  }

  return price;
}
