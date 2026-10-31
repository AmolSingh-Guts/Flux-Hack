import { Router } from 'express';
import { logs, run } from '../controllers/billing.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  billingLogListSchema,
  billingRunSchema,
} from '../validators/billing.validator.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticate, authorize('ADMIN'));

router.get('/logs', validate(billingLogListSchema, 'query'), asyncHandler(logs));
router.post('/run', validate(billingRunSchema), asyncHandler(run));

export default router;
