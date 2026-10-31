import { apiClient, unwrap, unwrapList } from './client.js';

export async function listCustomers(params) {
  const response = await apiClient.get('/customers', { params });
  return unwrapList(response);
}

export async function customerOptions(search = '') {
  const response = await apiClient.get('/customers/options', {
    params: { search },
  });
  return unwrap(response);
}

export async function getCustomer(id) {
  const response = await apiClient.get(`/customers/${id}`);
  return unwrap(response);
}

export async function createCustomer(payload) {
  const response = await apiClient.post('/customers', payload);
  return unwrap(response);
}

export async function updateCustomer(id, payload) {
  const response = await apiClient.patch(`/customers/${id}`, payload);
  return unwrap(response);
}

export async function deleteCustomer(id) {
  const response = await apiClient.delete(`/customers/${id}`);
  return unwrap(response);
}
