import { Router } from 'express';
import {
  closeSubscription,
  invoice,
  invoicePdf,
  invoices,
  pauseSubscription,
  payment,
  paymentReceipt,
  payments,
  profile,
  resumeSubscription,
  subscription,
  subscriptions,
  updateProfile,
} from '../controllers/portal.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import {
  authorize,
  requireCustomer,
} from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { idParamSchema } from '../validators/common.validator.js';
import {
  portalCloseSchema,
  portalListSchema,
  portalProfileSchema,
} from '../validators/dashboard.validator.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticate, authorize('CUSTOMER'), requireCustomer);

router.get('/profile', asyncHandler(profile));
router.patch('/profile', validate(portalProfileSchema), asyncHandler(updateProfile));

router.get('/subscriptions', asyncHandler(subscriptions));
router.get(
  '/subscriptions/:id',
  validate(idParamSchema, 'params'),
  asyncHandler(subscription),
);
router.post(
  '/subscriptions/:id/pause',
  validate(idParamSchema, 'params'),
  asyncHandler(pauseSubscription),
);
router.post(
  '/subscriptions/:id/resume',
  validate(idParamSchema, 'params'),
  asyncHandler(resumeSubscription),
);
router.post(
  '/subscriptions/:id/close',
  validate(idParamSchema, 'params'),
  validate(portalCloseSchema),
  asyncHandler(closeSubscription),
);

router.get('/invoices', validate(portalListSchema, 'query'), asyncHandler(invoices));
router.get('/invoices/:id', validate(idParamSchema, 'params'), asyncHandler(invoice));
router.get(
  '/invoices/:id/pdf',
  validate(idParamSchema, 'params'),
  asyncHandler(invoicePdf),
);

router.get('/payments', validate(portalListSchema, 'query'), asyncHandler(payments));
router.get('/payments/:id', validate(idParamSchema, 'params'), asyncHandler(payment));
router.get(
  '/payments/:id/receipt',
  validate(idParamSchema, 'params'),
  asyncHandler(paymentReceipt),
);

export default router;
