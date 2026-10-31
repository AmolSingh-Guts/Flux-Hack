import { Router } from 'express';
import { admin, customer, staff } from '../controllers/dashboard.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import {
  authorize,
  requireCustomer,
} from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { dashboardQuerySchema } from '../validators/dashboard.validator.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticate);

router.get(
  '/admin',
  authorize('ADMIN'),
  validate(dashboardQuerySchema, 'query'),
  asyncHandler(admin),
);
router.get(
  '/staff',
  authorize('STAFF'),
  validate(dashboardQuerySchema, 'query'),
  asyncHandler(staff),
);
router.get(
  '/customer',
  authorize('CUSTOMER'),
  requireCustomer,
  asyncHandler(customer),
);

export default router;
