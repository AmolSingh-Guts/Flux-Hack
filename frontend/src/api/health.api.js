import { apiClient } from './client.js';

export async function fetchHealth({ signal } = {}) {
  const { data } = await apiClient.get('/health', { signal });
  return data;
}

export async function fetchReadiness({ signal } = {}) {
  const { data } = await apiClient.get('/health/ready', { signal });
  return data;
}
