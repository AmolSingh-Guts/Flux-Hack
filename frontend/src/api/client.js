import axios from 'axios';
import { env } from '../config/env.js';

export const TOKEN_KEY = 'brightloop.token';
export const UNAUTHORIZED_EVENT = 'brightloop:unauthorized';

export function getStoredToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function storeToken(token) {
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_KEY);
  }
}

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 30_000,
  headers: {
    Accept: 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isCancel(error)) {
      const canceledError = new Error('The request was canceled.');
      canceledError.isCanceled = true;
      return Promise.reject(canceledError);
    }

    const responseData = error.response?.data;
    const isTimeout = error.code === 'ECONNABORTED';
    const message =
      responseData?.message ??
      (isTimeout
        ? 'The Brightloop API did not respond in time. Check that the backend is running on port 4000.'
        : 'Cannot reach the Brightloop API. Start the backend server on port 4000, then refresh this page.');

    const normalizedError = new Error(message);
    normalizedError.status = error.response?.status;
    normalizedError.details = responseData?.details;
    normalizedError.isNetworkError = !error.response;

    if (error.response?.status === 401 && getStoredToken()) {
      storeToken(null);
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }

    return Promise.reject(normalizedError);
  },
);

export function unwrap(response) {
  return response.data?.data;
}

export function unwrapList(response) {
  return {
    rows: response.data?.data ?? [],
    meta: response.data?.meta ?? null,
  };
}

export async function downloadFile(url, filename, config = {}) {
  const response = await apiClient.get(url, {
    responseType: 'blob',
    ...config,
  });
  const blob = new Blob([response.data], {
    type: response.headers['content-type'] ?? 'application/octet-stream',
  });
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(objectUrl);
}
