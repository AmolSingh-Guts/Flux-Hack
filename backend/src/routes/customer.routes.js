import { Router } from 'express';
import {
  destroy,
  index,
  options,
  show,
  store,
  update,
} from '../controllers/customer.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { idParamSchema } from '../validators/common.validator.js';
import {
  customerCreateSchema,
  customerListSchema,
  customerOptionsSchema,
  customerUpdateSchema,
} from '../validators/customer.validator.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticate, requirePermission('customers'));

router.get(
  '/options',
  validate(customerOptionsSchema, 'query'),
  asyncHandler(options),
);
router.get('/', validate(customerListSchema, 'query'), asyncHandler(index));
router.get('/:id', validate(idParamSchema, 'params'), asyncHandler(show));
router.post('/', validate(customerCreateSchema), asyncHandler(store));
router.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(customerUpdateSchema),
  asyncHandler(update),
);
router.delete('/:id', validate(idParamSchema, 'params'), asyncHandler(destroy));

export default router;
