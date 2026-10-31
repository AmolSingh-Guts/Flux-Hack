import { Router } from 'express';
import {
  destroy,
  index,
  show,
  store,
  update,
} from '../controllers/discount.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { idParamSchema } from '../validators/common.validator.js';
import {
  discountCreateSchema,
  discountListSchema,
  discountUpdateSchema,
} from '../validators/discount.validator.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticate, authorize('ADMIN'));

router.get(
  '/',
  validate(discountListSchema, 'query'),
  asyncHandler(index),
);
router.get('/:id', validate(idParamSchema, 'params'), asyncHandler(show));
router.post('/', validate(discountCreateSchema), asyncHandler(store));
router.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(discountUpdateSchema),
  asyncHandler(update),
);
router.delete('/:id', validate(idParamSchema, 'params'), asyncHandler(destroy));

export default router;
