import {
  createProductRecord,
  createVariantRecord,
  getProduct,
  getProductOptions,
  getVariant,
  listProductRecords,
  listVariantRecords,
  removeProduct,
  removeVariant,
  updateProductRecord,
  updateVariantRecord,
} from '../services/product.service.js';
import { requestIp } from '../services/audit.service.js';
import { validated } from '../middleware/validate.middleware.js';
import { sendCreated, sendSuccess } from '../utils/response.utils.js';

export async function index(request, response) {
  const result = await listProductRecords(validated(request, 'query'));
  return sendSuccess(response, result.rows, { meta: result.meta });
}

export async function options(request, response) {
  const products = await getProductOptions(
    validated(request, 'query').search ?? '',
  );
  return sendSuccess(response, products);
}

export async function show(request, response) {
  const product = await getProduct(validated(request, 'params').id);
  return sendSuccess(response, product);
}

export async function store(request, response) {
  const product = await createProductRecord(validated(request), {
    actor: request.user,
    ipAddress: requestIp(request),
  });
  return sendCreated(response, product, { message: 'Product created.' });
}

export async function update(request, response) {
  const product = await updateProductRecord(
    validated(request, 'params').id,
    validated(request),
    { actor: request.user, ipAddress: requestIp(request) },
  );
  return sendSuccess(response, product, { message: 'Product updated.' });
}

export async function destroy(request, response) {
  const result = await removeProduct(validated(request, 'params').id, {
    actor: request.user,
    ipAddress: requestIp(request),
  });
  return sendSuccess(response, result);
}

export async function variantsIndex(request, response) {
  const result = await listVariantRecords(validated(request, 'query'));
  return sendSuccess(response, result.rows, { meta: result.meta });
}

export async function variantStore(request, response) {
  const variant = await createVariantRecord(
    validated(request, 'params').id,
    validated(request),
    { actor: request.user, ipAddress: requestIp(request) },
  );
  return sendCreated(response, variant, { message: 'Product variant created.' });
}

export async function variantShow(request, response) {
  const variant = await getVariant(validated(request, 'params').id);
  return sendSuccess(response, variant);
}

export async function variantUpdate(request, response) {
  const variant = await updateVariantRecord(
    validated(request, 'params').id,
    validated(request),
    { actor: request.user, ipAddress: requestIp(request) },
  );
  return sendSuccess(response, variant, { message: 'Product variant updated.' });
}

export async function variantDestroy(request, response) {
  const result = await removeVariant(validated(request, 'params').id, {
    actor: request.user,
    ipAddress: requestIp(request),
  });
  return sendSuccess(response, result);
}
