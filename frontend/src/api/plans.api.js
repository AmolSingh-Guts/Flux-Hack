import { apiClient, unwrap, unwrapList } from './client.js';

export async function listPlans(params) {
  const response = await apiClient.get('/plans', { params });
  return unwrapList(response);
}

export async function planOptions(search = '') {
  const response = await apiClient.get('/plans/options', { params: { search } });
  return unwrap(response);
}

export async function getPlan(id) {
  const response = await apiClient.get(`/plans/${id}`);
  return unwrap(response);
}

export async function createPlan(payload) {
  const response = await apiClient.post('/plans', payload);
  return unwrap(response);
}

export async function updatePlan(id, payload) {
  const response = await apiClient.patch(`/plans/${id}`, payload);
  return unwrap(response);
}

export async function updatePlanStatus(id, status) {
  const response = await apiClient.patch(`/plans/${id}/status`, { status });
  return unwrap(response);
}

export async function deletePlan(id) {
  const response = await apiClient.delete(`/plans/${id}`);
  return unwrap(response);
}
