import { apiClient, unwrap, unwrapList } from './client.js';

export async function listSubscriptions(params) {
  const response = await apiClient.get('/subscriptions', { params });
  return unwrapList(response);
}

export async function getSubscription(id) {
  const response = await apiClient.get(`/subscriptions/${id}`);
  return unwrap(response);
}

export async function createSubscription(payload) {
  const response = await apiClient.post('/subscriptions', payload);
  return unwrap(response);
}

export async function updateSubscription(id, payload) {
  const response = await apiClient.patch(`/subscriptions/${id}`, payload);
  return unwrap(response);
}

export async function deleteSubscription(id) {
  const response = await apiClient.delete(`/subscriptions/${id}`);
  return unwrap(response);
}

export async function confirmSubscription(id) {
  const response = await apiClient.post(`/subscriptions/${id}/confirm`);
  return unwrap(response);
}

export async function activateSubscription(id) {
  const response = await apiClient.post(`/subscriptions/${id}/activate`);
  return unwrap(response);
}

export async function pauseSubscription(id) {
  const response = await apiClient.post(`/subscriptions/${id}/pause`);
  return unwrap(response);
}

export async function resumeSubscription(id) {
  const response = await apiClient.post(`/subscriptions/${id}/resume`);
  return unwrap(response);
}

export async function renewSubscription(id) {
  const response = await apiClient.post(`/subscriptions/${id}/renew`);
  return unwrap(response);
}

export async function closeSubscription(id, payload = {}) {
  const response = await apiClient.post(`/subscriptions/${id}/close`, payload);
  return unwrap(response);
}

export async function generateSubscriptionInvoice(id, payload = {}) {
  const response = await apiClient.post(`/subscriptions/${id}/invoices`, payload);
  return unwrap(response);
}
