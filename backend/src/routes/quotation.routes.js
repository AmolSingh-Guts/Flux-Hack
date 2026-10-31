import { Router } from 'express';
import {
  convert,
  destroy,
  downloadPdf,
  index,
  send,
  show,
  store,
  templates,
  update,
  updateStatus,
} from '../controllers/quotation.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { idParamSchema } from '../validators/common.validator.js';
import {
  quotationConvertSchema,
  quotationCreateSchema,
  quotationEmailSchema,
  quotationListSchema,
  quotationStatusSchema,
  quotationUpdateSchema,
} from '../validators/quotation.validator.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticate, requirePermission('quotations'));

router.get('/templates', asyncHandler(templates));
router.get('/', validate(quotationListSchema, 'query'), asyncHandler(index));
router.get('/:id', validate(idParamSchema, 'params'), asyncHandler(show));
router.get(
  '/:id/pdf',
  validate(idParamSchema, 'params'),
  asyncHandler(downloadPdf),
);
router.post('/', validate(quotationCreateSchema), asyncHandler(store));
router.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(quotationUpdateSchema),
  asyncHandler(update),
);
router.delete('/:id', validate(idParamSchema, 'params'), asyncHandler(destroy));
router.post(
  '/:id/send',
  validate(idParamSchema, 'params'),
  validate(quotationEmailSchema),
  asyncHandler(send),
);
router.patch(
  '/:id/status',
  validate(idParamSchema, 'params'),
  validate(quotationStatusSchema),
  asyncHandler(updateStatus),
);
router.post(
  '/:id/convert',
  validate(idParamSchema, 'params'),
  validate(quotationConvertSchema),
  asyncHandler(convert),
);

export default router;
