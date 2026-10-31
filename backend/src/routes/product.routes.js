import { Router } from 'express';
import {
  destroy,
  index,
  options,
  show,
  store,
  update,
  variantStore,
} from '../controllers/product.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { idParamSchema } from '../validators/common.validator.js';
import {
  productCreateSchema,
  productListSchema,
  productUpdateSchema,
  variantCreateSchema,
} from '../validators/product.validator.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticate);

router.get(
  '/options',
  authorize('ADMIN', 'STAFF'),
  asyncHandler(options),
);
router.get(
  '/',
  authorize('ADMIN', 'STAFF'),
  validate(productListSchema, 'query'),
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
  validate(productCreateSchema),
  asyncHandler(store),
);
router.patch(
  '/:id',
  authorize('ADMIN'),
  validate(idParamSchema, 'params'),
  validate(productUpdateSchema),
  asyncHandler(update),
);
router.delete(
  '/:id',
  authorize('ADMIN'),
  validate(idParamSchema, 'params'),
  asyncHandler(destroy),
);
router.post(
  '/:id/variants',
  authorize('ADMIN'),
  validate(idParamSchema, 'params'),
  validate(variantCreateSchema),
  asyncHandler(variantStore),
);

export default router;
