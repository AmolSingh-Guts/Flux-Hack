import { Router } from 'express';
import {
  activate,
  close,
  confirm,
  destroy,
  generateInvoice,
  index,
  pause,
  renew,
  resume,
  show,
  store,
  update,
} from '../controllers/subscription.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { idParamSchema } from '../validators/common.validator.js';
import {
  subscriptionCloseSchema,
  subscriptionCreateSchema,
  subscriptionInvoiceSchema,
  subscriptionListSchema,
  subscriptionUpdateSchema,
} from '../validators/subscription.validator.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticate, requirePermission('subscriptions'));

router.get('/', validate(subscriptionListSchema, 'query'), asyncHandler(index));
router.get('/:id', validate(idParamSchema, 'params'), asyncHandler(show));
router.post('/', validate(subscriptionCreateSchema), asyncHandler(store));
router.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(subscriptionUpdateSchema),
  asyncHandler(update),
);
router.delete('/:id', validate(idParamSchema, 'params'), asyncHandler(destroy));
router.post(
  '/:id/confirm',
  validate(idParamSchema, 'params'),
  asyncHandler(confirm),
);
router.post(
  '/:id/activate',
  validate(idParamSchema, 'params'),
  asyncHandler(activate),
);
router.post('/:id/pause', validate(idParamSchema, 'params'), asyncHandler(pause));
router.post(
  '/:id/resume',
  validate(idParamSchema, 'params'),
  asyncHandler(resume),
);
router.post('/:id/renew', validate(idParamSchema, 'params'), asyncHandler(renew));
router.post(
  '/:id/close',
  validate(idParamSchema, 'params'),
  validate(subscriptionCloseSchema),
  asyncHandler(close),
);
router.post(
  '/:id/invoices',
  validate(idParamSchema, 'params'),
  validate(subscriptionInvoiceSchema),
  asyncHandler(generateInvoice),
);

export default router;
