import { Router } from 'express';
import {
  downloadReceipt,
  index,
  sendReceipt,
  show,
  store,
  voidPayment,
} from '../controllers/payment.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { idParamSchema } from '../validators/common.validator.js';
import {
  paymentCreateSchema,
  paymentEmailSchema,
  paymentListSchema,
} from '../validators/payment.validator.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticate, requirePermission('payments'));

router.get('/', validate(paymentListSchema, 'query'), asyncHandler(index));
router.get('/:id', validate(idParamSchema, 'params'), asyncHandler(show));
router.get(
  '/:id/receipt',
  validate(idParamSchema, 'params'),
  asyncHandler(downloadReceipt),
);
router.post('/', validate(paymentCreateSchema), asyncHandler(store));
router.post(
  '/:id/void',
  validate(idParamSchema, 'params'),
  asyncHandler(voidPayment),
);
router.post(
  '/:id/send-receipt',
  validate(idParamSchema, 'params'),
  validate(paymentEmailSchema),
  asyncHandler(sendReceipt),
);

export default router;
