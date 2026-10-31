import { Router } from 'express';
import {
  active,
  destroy,
  index,
  show,
  store,
  update,
} from '../controllers/tax.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { idParamSchema } from '../validators/common.validator.js';
import {
  taxCreateSchema,
  taxListSchema,
  taxUpdateSchema,
} from '../validators/tax.validator.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticate, authorize('ADMIN'));

router.get('/active', asyncHandler(active));
router.get('/', validate(taxListSchema, 'query'), asyncHandler(index));
router.get('/:id', validate(idParamSchema, 'params'), asyncHandler(show));
router.post('/', validate(taxCreateSchema), asyncHandler(store));
router.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(taxUpdateSchema),
  asyncHandler(update),
);
router.delete('/:id', validate(idParamSchema, 'params'), asyncHandler(destroy));

export default router;
