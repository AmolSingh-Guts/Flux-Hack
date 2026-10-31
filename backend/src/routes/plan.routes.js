import { Router } from 'express';
import { z } from 'zod';
import {
  destroy,
  index,
  options,
  show,
  store,
  update,
  updateStatus,
} from '../controllers/plan.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { idParamSchema } from '../validators/common.validator.js';
import {
  planCreateSchema,
  planListSchema,
  planOptionsSchema,
  planUpdateSchema,
} from '../validators/plan.validator.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticate);

router.get(
  '/options',
  authorize('ADMIN', 'STAFF'),
  validate(planOptionsSchema, 'query'),
  asyncHandler(options),
);
router.get(
  '/',
  authorize('ADMIN', 'STAFF'),
  validate(planListSchema, 'query'),
  asyncHandler(index),
);
router.get(
  '/:id',
  authorize('ADMIN', 'STAFF'),
  validate(idParamSchema, 'params'),
  asyncHandler(show),
);

router.post(
  '/',
  authorize('ADMIN'),
  validate(planCreateSchema),
  asyncHandler(store),
);
router.patch(
  '/:id/status',
  authorize('ADMIN'),
  validate(idParamSchema, 'params'),
  validate(z.object({ status: z.enum(['ACTIVE', 'INACTIVE']) })),
  asyncHandler(updateStatus),
);
router.patch(
  '/:id',
  authorize('ADMIN'),
  validate(idParamSchema, 'params'),
  validate(planUpdateSchema),
  asyncHandler(update),
);
router.delete(
  '/:id',
  authorize('ADMIN'),
  validate(idParamSchema, 'params'),
  asyncHandler(destroy),
);

export default router;
