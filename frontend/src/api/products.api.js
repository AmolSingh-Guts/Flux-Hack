import { apiClient, unwrap, unwrapList } from './client.js';

export async function listProducts(params) {
  const response = await apiClient.get('/products', { params });
  return unwrapList(response);
}

export async function productOptions(search = '') {
  const response = await apiClient.get('/products/options', {
    params: { search },
  });
  return unwrap(response);
}

export async function getProduct(id) {
  const response = await apiClient.get(`/products/${id}`);
  return unwrap(response);
}

export async function createProduct(payload) {
  const response = await apiClient.post('/products', payload);
  return unwrap(response);
}

export async function updateProduct(id, payload) {
  const response = await apiClient.patch(`/products/${id}`, payload);
  return unwrap(response);
}

export async function deleteProduct(id) {
  const response = await apiClient.delete(`/products/${id}`);
  return unwrap(response);
}

export async function listVariants(params) {
  const response = await apiClient.get('/variants', { params });
  return unwrapList(response);
}

export async function getVariant(id) {
  const response = await apiClient.get(`/variants/${id}`);
  return unwrap(response);
}

export async function createVariant(productId, payload) {
  const response = await apiClient.post(`/products/${productId}/variants`, payload);
  return unwrap(response);
}

export async function updateVariant(id, payload) {
  const response = await apiClient.patch(`/variants/${id}`, payload);
  return unwrap(response);
}

export async function deleteVariant(id) {
  const response = await apiClient.delete(`/variants/${id}`);
  return unwrap(response);
}
