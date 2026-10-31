import { apiClient, downloadFile, unwrap } from './client.js';

export async function adminDashboard(params) {
  const response = await apiClient.get('/dashboard/admin', { params });
  return unwrap(response);
}

export async function staffDashboard(params) {
  const response = await apiClient.get('/dashboard/staff', { params });
  return unwrap(response);
}

export async function customerDashboard() {
  const response = await apiClient.get('/dashboard/customer');
  return unwrap(response);
}

export async function reportSummary(params) {
  const response = await apiClient.get('/reports', { params });
  return unwrap(response);
}

export async function exportReport({ type, ...params }) {
  return downloadFile('/reports/export', `${type}-report.csv`, {
    params: { type, ...params },
  });
}
