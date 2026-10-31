import { Router } from 'express';
import {
  cancel,
  confirm,
  destroy,
  downloadPdf,
  index,
  send,
  show,
  store,
  update,
} from '../controllers/invoice.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { idParamSchema } from '../validators/common.validator.js';
import {
  invoiceCreateSchema,
  invoiceEmailSchema,
  invoiceListSchema,
  invoiceUpdateSchema,
} from '../validators/invoice.validator.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticate, requirePermission('invoices'));

router.get('/', validate(invoiceListSchema, 'query'), asyncHandler(index));
router.get('/:id', validate(idParamSchema, 'params'), asyncHandler(show));
router.get(
  '/:id/pdf',
  validate(idParamSchema, 'params'),
  asyncHandler(downloadPdf),
);
router.post('/', validate(invoiceCreateSchema), asyncHandler(store));
router.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(invoiceUpdateSchema),
  asyncHandler(update),
);
router.delete('/:id', validate(idParamSchema, 'params'), asyncHandler(destroy));
router.post(
  '/:id/send',
  validate(idParamSchema, 'params'),
  validate(invoiceEmailSchema),
  asyncHandler(send),
);
router.post(
  '/:id/confirm',
  validate(idParamSchema, 'params'),
  asyncHandler(confirm),
);
router.post(
  '/:id/cancel',
  validate(idParamSchema, 'params'),
  asyncHandler(cancel),
);

export default router;
