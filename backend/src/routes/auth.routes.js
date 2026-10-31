import { Router } from 'express';
import {
  completePasswordReset,
  currentUser,
  loginUser,
  logoutUser,
  register,
  requestPasswordReset,
  updatePassword,
  updateProfile,
} from '../controllers/auth.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from '../validators/auth.validator.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

router.post('/register', validate(registerSchema), asyncHandler(register));
router.post('/login', validate(loginSchema), asyncHandler(loginUser));
router.post(
  '/forgot-password',
  validate(forgotPasswordSchema),
  asyncHandler(requestPasswordReset),
);
router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  asyncHandler(completePasswordReset),
);

router.use(authenticate);
router.get('/me', asyncHandler(currentUser));
router.patch(
  '/profile',
  validate(updateProfileSchema),
  asyncHandler(updateProfile),
);
router.post('/logout', asyncHandler(logoutUser));
router.patch(
  '/change-password',
  validate(changePasswordSchema),
  asyncHandler(updatePassword),
);

export default router;
