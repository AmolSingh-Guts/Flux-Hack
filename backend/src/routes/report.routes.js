import { Router } from 'express';
import { exportCsv, summary } from '../controllers/report.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  reportExportSchema,
  reportQuerySchema,
} from '../validators/dashboard.validator.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticate, authorize('ADMIN'));

router.get('/', validate(reportQuerySchema, 'query'), asyncHandler(summary));
router.get(
  '/export',
  validate(reportExportSchema, 'query'),
  asyncHandler(exportCsv),
);

export default router;
