import { Router } from 'express';
import { show, update } from '../controllers/settings.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { settingsUpdateSchema } from '../validators/dashboard.validator.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticate, authorize('ADMIN'));

router.get('/', asyncHandler(show));
router.patch('/', validate(settingsUpdateSchema), asyncHandler(update));

export default router;
