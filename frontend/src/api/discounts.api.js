import { apiClient, unwrap, unwrapList } from './client.js';

export async function listDiscounts(params) {
  const response = await apiClient.get('/discounts', { params });
  return unwrapList(response);
}

export async function getDiscount(id) {
  const response = await apiClient.get(`/discounts/${id}`);
  return unwrap(response);
}

export async function createDiscount(payload) {
  const response = await apiClient.post('/discounts', payload);
  return unwrap(response);
}

export async function updateDiscount(id, payload) {
  const response = await apiClient.patch(`/discounts/${id}`, payload);
  return unwrap(response);
}

export async function deleteDiscount(id) {
  const response = await apiClient.delete(`/discounts/${id}`);
  return unwrap(response);
}
