import { apiClient, unwrap, unwrapList } from './client.js';

export async function listTaxes(params) {
  const response = await apiClient.get('/taxes', { params });
  return unwrapList(response);
}

export async function activeTaxes() {
  const response = await apiClient.get('/taxes/active');
  return unwrap(response);
}

export async function createTax(payload) {
  const response = await apiClient.post('/taxes', payload);
  return unwrap(response);
}

export async function updateTax(id, payload) {
  const response = await apiClient.patch(`/taxes/${id}`, payload);
  return unwrap(response);
}

export async function deleteTax(id) {
  const response = await apiClient.delete(`/taxes/${id}`);
  return unwrap(response);
}
