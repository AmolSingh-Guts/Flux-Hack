import {
  listBillingLogs,
  runBillingCycle,
} from '../services/billing.service.js';
import { requestIp } from '../services/audit.service.js';
import { writeAuditLog } from '../services/audit.service.js';
import { validated } from '../middleware/validate.middleware.js';
import { sendSuccess } from '../utils/response.utils.js';
import { parsePagination, paginationMeta } from '../utils/pagination.utils.js';

export async function run(request, response) {
  const { date } = validated(request);
  const summary = await runBillingCycle({
    date,
    actorId: request.user.id,
  });

  await writeAuditLog({
    userId: request.user.id,
    action: 'RUN_BILLING',
    entityType: 'BILLING',
    details: summary,
    ipAddress: requestIp(request),
  });

  return sendSuccess(response, summary, {
    message: `Billing run completed: ${summary.generated.length} invoice(s) generated.`,
  });
}

export async function logs(request, response) {
  const query = validated(request, 'query');
  const pagination = parsePagination(query, {
    allowedSortFields: ['created_at'],
    defaultSortBy: 'created_at',
  });
  const result = await listBillingLogs({ ...query, ...pagination });

  return sendSuccess(response, result.rows, {
    meta: paginationMeta({ ...pagination, total: result.total }),
  });
}
