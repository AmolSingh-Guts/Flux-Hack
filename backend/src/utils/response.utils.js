export function sendSuccess(response, data, options = {}) {
  const payload = { success: true, data };

  if (options.meta) {
    payload.meta = options.meta;
  }

  if (options.message) {
    payload.message = options.message;
  }

  return response.status(options.status ?? 200).json(payload);
}

export function sendCreated(response, data, options = {}) {
  return sendSuccess(response, data, { ...options, status: 201 });
}
