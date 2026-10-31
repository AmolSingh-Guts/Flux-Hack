import { exportReport, reportSummary } from '../services/report.service.js';
import { validated } from '../middleware/validate.middleware.js';
import { sendSuccess } from '../utils/response.utils.js';
import { sendCsv } from '../utils/csv.utils.js';

export async function summary(request, response) {
  const result = await reportSummary(validated(request, 'query'));
  return sendSuccess(response, result);
}

export async function exportCsv(request, response) {
  const result = await exportReport(validated(request, 'query'));
  return sendCsv(response, result.filename, result.csv);
}
