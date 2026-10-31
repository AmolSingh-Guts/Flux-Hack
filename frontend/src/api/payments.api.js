import { apiClient, downloadFile, unwrap, unwrapList } from './client.js';

export async function listPayments(params) {
  const response = await apiClient.get('/payments', { params });
  return unwrapList(response);
}

export async function getPayment(id) {
  const response = await apiClient.get(`/payments/${id}`);
  return unwrap(response);
}

export async function createPayment(payload) {
  const response = await apiClient.post('/payments', payload);
  return unwrap(response);
}

export async function voidPayment(id) {
  const response = await apiClient.post(`/payments/${id}/void`);
  return unwrap(response);
}

export async function sendPaymentReceipt(id, payload = {}) {
  const response = await apiClient.post(`/payments/${id}/send-receipt`, payload);
  return unwrap(response);
}

export async function downloadPaymentReceipt(payment) {
  return downloadFile(
    `/payments/${payment.id}/receipt`,
    `${payment.payment_number}-receipt.pdf`,
  );
}
