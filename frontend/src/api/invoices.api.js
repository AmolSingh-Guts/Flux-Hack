import { apiClient, downloadFile, unwrap, unwrapList } from './client.js';

export async function listInvoices(params) {
  const response = await apiClient.get('/invoices', { params });
  return unwrapList(response);
}

export async function getInvoice(id) {
  const response = await apiClient.get(`/invoices/${id}`);
  return unwrap(response);
}

export async function createInvoice(payload) {
  const response = await apiClient.post('/invoices', payload);
  return unwrap(response);
}

export async function updateInvoice(id, payload) {
  const response = await apiClient.patch(`/invoices/${id}`, payload);
  return unwrap(response);
}

export async function deleteInvoice(id) {
  const response = await apiClient.delete(`/invoices/${id}`);
  return unwrap(response);
}

export async function confirmInvoice(id) {
  const response = await apiClient.post(`/invoices/${id}/confirm`);
  return unwrap(response);
}

export async function cancelInvoice(id) {
  const response = await apiClient.post(`/invoices/${id}/cancel`);
  return unwrap(response);
}

export async function sendInvoice(id, payload = {}) {
  const response = await apiClient.post(`/invoices/${id}/send`, payload);
  return unwrap(response);
}

export async function downloadInvoicePdf(invoice) {
  return downloadFile(
    `/invoices/${invoice.id}/pdf`,
    `${invoice.invoice_number}.pdf`,
  );
}
