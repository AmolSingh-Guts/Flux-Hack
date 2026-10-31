const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const normalizedBaseUrl = (configuredBaseUrl || '/api').replace(/\/+$/, '');

export const env = Object.freeze({
  apiBaseUrl: normalizedBaseUrl || '/api',
});
