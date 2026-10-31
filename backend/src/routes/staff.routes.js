import { Router } from 'express';
import {
  index,
  show,
  store,
  update,
} from '../controllers/staff.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  basePaginationSchema,
  idParamSchema,
} from '../validators/common.validator.js';
import {
  staffCreateSchema,
  staffUpdateSchema,
} from '../validators/auth.validator.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticate, authorize('ADMIN'));

router.get('/', validate(basePaginationSchema, 'query'), asyncHandler(index));
router.get('/:id', validate(idParamSchema, 'params'), asyncHandler(show));
router.post('/', validate(staffCreateSchema), asyncHandler(store));
router.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(staffUpdateSchema),
  asyncHandler(update),
);

export default router;
