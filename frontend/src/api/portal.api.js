import { apiClient, downloadFile, unwrap, unwrapList } from './client.js';

export async function getProfile() {
  const response = await apiClient.get('/portal/profile');
  return unwrap(response);
}

export async function updateProfile(payload) {
  const response = await apiClient.patch('/portal/profile', payload);
  return unwrap(response);
}

export async function listPortalSubscriptions() {
  const response = await apiClient.get('/portal/subscriptions');
  return unwrap(response);
}

export async function getPortalSubscription(id) {
  const response = await apiClient.get(`/portal/subscriptions/${id}`);
  return unwrap(response);
}

export async function pausePortalSubscription(id) {
  const response = await apiClient.post(`/portal/subscriptions/${id}/pause`);
  return unwrap(response);
}

export async function resumePortalSubscription(id) {
  const response = await apiClient.post(`/portal/subscriptions/${id}/resume`);
  return unwrap(response);
}

export async function closePortalSubscription(id, payload = {}) {
  const response = await apiClient.post(`/portal/subscriptions/${id}/close`, payload);
  return unwrap(response);
}

export async function listPortalInvoices(params) {
  const response = await apiClient.get('/portal/invoices', { params });
  return unwrapList(response);
}

export async function getPortalInvoice(id) {
  const response = await apiClient.get(`/portal/invoices/${id}`);
  return unwrap(response);
}

export async function downloadPortalInvoicePdf(invoice) {
  return downloadFile(
    `/portal/invoices/${invoice.id}/pdf`,
    `${invoice.invoice_number}.pdf`,
  );
}

export async function listPortalPayments(params) {
  const response = await apiClient.get('/portal/payments', { params });
  return unwrapList(response);
}

export async function getPortalPayment(id) {
  const response = await apiClient.get(`/portal/payments/${id}`);
  return unwrap(response);
}

export async function downloadPortalReceipt(payment) {
  return downloadFile(
    `/portal/payments/${payment.id}/receipt`,
    `${payment.payment_number}-receipt.pdf`,
  );
}
