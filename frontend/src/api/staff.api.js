import { apiClient, unwrap, unwrapList } from './client.js';

export async function listStaffMembers(params) {
  const response = await apiClient.get('/staff', { params });
  return unwrapList(response);
}

export async function listStaff(params) {
  const response = await apiClient.get('/staff', { params });
  return unwrapList(response);
}

export async function getStaff(id) {
  const response = await apiClient.get(`/staff/${id}`);
  return unwrap(response);
}

export async function createStaff(payload) {
  const response = await apiClient.post('/staff', payload);
  return unwrap(response);
}

export async function updateStaff(id, payload) {
  const response = await apiClient.patch(`/staff/${id}`, payload);
  return unwrap(response);
}
