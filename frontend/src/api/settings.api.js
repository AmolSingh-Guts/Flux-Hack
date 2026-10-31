import { apiClient, unwrap, unwrapList } from './client.js';

export async function getSettings() {
  const response = await apiClient.get('/settings');
  return unwrap(response);
}

export async function updateSettings(payload) {
  const response = await apiClient.patch('/settings', payload);
  return unwrap(response);
}

export async function billingLogs(params) {
  const response = await apiClient.get('/billing/logs', { params });
  return unwrapList(response);
}

export async function runBilling(payload = {}) {
  const response = await apiClient.post('/billing/run', payload);
  return unwrap(response);
}
