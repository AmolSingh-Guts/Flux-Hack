import { apiClient, unwrap } from './client.js';

export async function login(payload) {
  const response = await apiClient.post('/auth/login', payload);
  return unwrap(response);
}

export async function register(payload) {
  const response = await apiClient.post('/auth/register', payload);
  return unwrap(response);
}

export async function me() {
  const response = await apiClient.get('/auth/me');
  return unwrap(response);
}

export async function logout() {
  const response = await apiClient.post('/auth/logout');
  return unwrap(response);
}

export async function forgotPassword(payload) {
  const response = await apiClient.post('/auth/forgot-password', payload);
  return unwrap(response);
}

export async function resetPassword(payload) {
  const response = await apiClient.post('/auth/reset-password', payload);
  return unwrap(response);
}

export async function changePassword(payload) {
  const response = await apiClient.patch('/auth/change-password', payload);
  return unwrap(response);
}

export async function updateAccountProfile(payload) {
  const response = await apiClient.patch('/auth/profile', payload);
  return unwrap(response);
}
