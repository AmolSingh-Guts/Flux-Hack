import { Router } from 'express';
import {
  variantDestroy,
  variantsIndex,
  variantShow,
  variantUpdate,
} from '../controllers/product.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { idParamSchema } from '../validators/common.validator.js';
import {
  variantListSchema,
  variantUpdateSchema,
} from '../validators/product.validator.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorize('ADMIN', 'STAFF'),
  validate(variantListSchema, 'query'),
  asyncHandler(variantsIndex),
);
router.get(
  '/:id',
  authorize('ADMIN', 'STAFF'),
  validate(idParamSchema, 'params'),
  asyncHandler(variantShow),
);
router.patch(
  '/:id',
  authorize('ADMIN'),
  validate(idParamSchema, 'params'),
  validate(variantUpdateSchema),
  asyncHandler(variantUpdate),
);
router.delete(
  '/:id',
  authorize('ADMIN'),
  validate(idParamSchema, 'params'),
  asyncHandler(variantDestroy),
);

export default router;
