import { withTransaction } from '../config/database.js';
import {
  createProduct,
  createVariant,
  deleteProduct,
  deleteVariant,
  findProductById,
  findVariantById,
  listProductOptions,
  listProducts,
  listVariants,
  productDependencyCounts,
  syncProductTaxes,
  updateProduct,
  updateVariant,
  variantDependencyCounts,
} from '../models/product.model.js';
import { findTaxRulesByIds } from '../models/tax.model.js';
import ApiError from '../utils/ApiError.js';
import { parsePagination, paginationMeta } from '../utils/pagination.utils.js';
import { writeAuditLog } from './audit.service.js';

async function ensureTaxRulesExist(taxRuleIds, connection) {
  const uniqueIds = [...new Set(taxRuleIds)];

  if (uniqueIds.length === 0) {
    return uniqueIds;
  }

  const taxes = await findTaxRulesByIds(uniqueIds, connection);

  if (taxes.length !== uniqueIds.length) {
    throw new ApiError(400, 'One or more selected tax rules do not exist.');
  }

  return uniqueIds;
}

export async function listProductRecords(query) {
  const pagination = parsePagination(query, {
    allowedSortFields: [
      'name',
      'product_type',
      'sales_price',
      'cost_price',
      'status',
      'created_at',
    ],
    defaultSortBy: 'created_at',
  });
  const result = await listProducts({ ...query, ...pagination });

  return {
    rows: result.rows,
    meta: paginationMeta({ ...pagination, total: result.total }),
  };
}

export async function getProduct(productId) {
  const product = await findProductById(productId);

  if (!product) {
    throw new ApiError(404, 'Product not found.');
  }

  return product;
}

export async function getProductOptions(search) {
  return listProductOptions(search);
}

export async function createProductRecord(payload, context = {}) {
  const productId = await withTransaction(async (connection) => {
    const taxRuleIds = await ensureTaxRulesExist(
      payload.taxRuleIds ?? [],
      connection,
    );
    const id = await createProduct(connection, payload);
    await syncProductTaxes(connection, id, taxRuleIds);
    await writeAuditLog({
      userId: context.actor?.id,
      action: 'CREATE',
      entityType: 'PRODUCT',
      entityId: id,
      details: { name: payload.name, taxRuleIds },
      ipAddress: context.ipAddress,
      connection,
    });
    return id;
  });

  return getProduct(productId);
}

export async function updateProductRecord(productId, payload, context = {}) {
  await getProduct(productId);

  await withTransaction(async (connection) => {
    await updateProduct(connection, productId, payload);

    if (payload.taxRuleIds !== undefined) {
      const taxRuleIds = await ensureTaxRulesExist(
        payload.taxRuleIds,
        connection,
      );
      await syncProductTaxes(connection, productId, taxRuleIds);
    }

    await writeAuditLog({
      userId: context.actor?.id,
      action: 'UPDATE',
      entityType: 'PRODUCT',
      entityId: productId,
      details: { changedFields: Object.keys(payload) },
      ipAddress: context.ipAddress,
      connection,
    });
  });

  return getProduct(productId);
}

export async function removeProduct(productId, context = {}) {
  await getProduct(productId);
  const dependencies = await productDependencyCounts(productId);
  const hasDependencies = Object.values(dependencies).some(
    (count) => Number(count) > 0,
  );

  if (hasDependencies) {
    throw new ApiError(
      409,
      'This product is used by plans or documents and cannot be deleted. Mark it inactive instead.',
      { dependencies },
    );
  }

  await withTransaction(async (connection) => {
    await deleteProduct(connection, productId);
    await writeAuditLog({
      userId: context.actor?.id,
      action: 'DELETE',
      entityType: 'PRODUCT',
      entityId: productId,
      ipAddress: context.ipAddress,
      connection,
    });
  });

  return { message: 'Product deleted.' };
}

export async function listVariantRecords(query) {
  const pagination = parsePagination(query, {
    allowedSortFields: [
      'name',
      'brand',
      'additional_price',
      'product_name',
      'created_at',
    ],
    defaultSortBy: 'created_at',
  });
  const result = await listVariants({ ...query, ...pagination });

  return {
    rows: result.rows,
    meta: paginationMeta({ ...pagination, total: result.total }),
  };
}

export async function getVariant(variantId) {
  const variant = await findVariantById(variantId);

  if (!variant) {
    throw new ApiError(404, 'Product variant not found.');
  }

  return variant;
}

export async function createVariantRecord(productId, payload, context = {}) {
  await getProduct(productId);

  const variantId = await withTransaction(async (connection) => {
    const id = await createVariant(connection, productId, payload);
    await writeAuditLog({
      userId: context.actor?.id,
      action: 'CREATE',
      entityType: 'PRODUCT_VARIANT',
      entityId: id,
      details: { productId, name: payload.name },
      ipAddress: context.ipAddress,
      connection,
    });
    return id;
  });

  return getVariant(variantId);
}

export async function updateVariantRecord(variantId, payload, context = {}) {
  await getVariant(variantId);

  await withTransaction(async (connection) => {
    await updateVariant(connection, variantId, payload);
    await writeAuditLog({
      userId: context.actor?.id,
      action: 'UPDATE',
      entityType: 'PRODUCT_VARIANT',
      entityId: variantId,
      details: { changedFields: Object.keys(payload) },
      ipAddress: context.ipAddress,
      connection,
    });
  });

  return getVariant(variantId);
}

export async function removeVariant(variantId, context = {}) {
  await getVariant(variantId);
  const dependencies = await variantDependencyCounts(variantId);
  const hasDependencies = Object.values(dependencies).some(
    (count) => Number(count) > 0,
  );

  if (hasDependencies) {
    throw new ApiError(
      409,
      'This variant is used by existing documents and cannot be deleted. Mark it inactive instead.',
      { dependencies },
    );
  }

  await withTransaction(async (connection) => {
    await deleteVariant(connection, variantId);
    await writeAuditLog({
      userId: context.actor?.id,
      action: 'DELETE',
      entityType: 'PRODUCT_VARIANT',
      entityId: variantId,
      ipAddress: context.ipAddress,
      connection,
    });
  });

  return { message: 'Product variant deleted.' };
}
