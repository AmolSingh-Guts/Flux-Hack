import { apiClient, downloadFile, unwrap, unwrapList } from './client.js';

export async function listQuotations(params) {
  const response = await apiClient.get('/quotations', { params });
  return unwrapList(response);
}

export async function quotationTemplates() {
  const response = await apiClient.get('/quotations/templates');
  return unwrap(response);
}

export async function getQuotation(id) {
  const response = await apiClient.get(`/quotations/${id}`);
  return unwrap(response);
}

export async function createQuotation(payload) {
  const response = await apiClient.post('/quotations', payload);
  return unwrap(response);
}

export async function updateQuotation(id, payload) {
  const response = await apiClient.patch(`/quotations/${id}`, payload);
  return unwrap(response);
}

export async function deleteQuotation(id) {
  const response = await apiClient.delete(`/quotations/${id}`);
  return unwrap(response);
}

export async function sendQuotation(id, payload = {}) {
  const response = await apiClient.post(`/quotations/${id}/send`, payload);
  return unwrap(response);
}

export async function updateQuotationStatus(id, status) {
  const response = await apiClient.patch(`/quotations/${id}/status`, { status });
  return unwrap(response);
}

export async function convertQuotation(id, payload = {}) {
  const response = await apiClient.post(`/quotations/${id}/convert`, payload);
  return unwrap(response);
}

export async function downloadQuotationPdf(quotation) {
  return downloadFile(
    `/quotations/${quotation.id}/pdf`,
    `${quotation.quotation_number}.pdf`,
  );
}
