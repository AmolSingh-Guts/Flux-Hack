import { readSettings, saveSettings } from '../services/settings.service.js';
import { requestIp } from '../services/audit.service.js';
import { validated } from '../middleware/validate.middleware.js';
import { sendSuccess } from '../utils/response.utils.js';

export async function show(request, response) {
  const settings = await readSettings();
  return sendSuccess(response, settings);
}

export async function update(request, response) {
  const settings = await saveSettings(validated(request), {
    actor: request.user,
    ipAddress: requestIp(request),
  });
  return sendSuccess(response, settings, { message: 'Settings updated.' });
}
