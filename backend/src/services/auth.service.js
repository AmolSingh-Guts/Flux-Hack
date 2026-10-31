import env from '../config/env.js';
import { withTransaction } from '../config/database.js';
import {
  createPasswordResetToken,
  createUser,
  deleteExpiredPasswordResetTokens,
  findUserByEmail,
  findUserById,
  findValidPasswordResetToken,
  markPasswordResetTokenUsed,
  updateLastLogin,
  updatePassword,
  updateUserProfile,
} from '../models/user.model.js';
import {
  createCustomer,
  findCustomerByEmail,
} from '../models/customer.model.js';
import ApiError from '../utils/ApiError.js';
import {
  createOpaqueToken,
  hashOpaqueToken,
  hashPassword,
  verifyPassword,
} from '../utils/password.utils.js';
import { signAccessToken } from '../utils/token.utils.js';
import { todayString } from '../utils/date.utils.js';
import { writeAuditLog } from './audit.service.js';
import { sendPasswordResetEmail } from './email.service.js';

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    customerId: user.customer_id ?? null,
    customerName: user.customer_name ?? null,
    companyName: user.company_name ?? null,
    permissions: user.permissions ?? [],
    isActive: Boolean(user.is_active),
    lastLoginAt: user.last_login_at ?? null,
    createdAt: user.created_at,
  };
}

function authResponse(user) {
  return {
    token: signAccessToken(user),
    user: publicUser(user),
  };
}

export async function registerCustomer(payload, context = {}) {
  const existingUser = await findUserByEmail(payload.email);
  const existingCustomer = await findCustomerByEmail(payload.email);

  if (existingUser || existingCustomer) {
    throw new ApiError(409, 'An account with this email already exists.');
  }

  const passwordHash = await hashPassword(payload.password);

  const user = await withTransaction(async (connection) => {
    const customerId = await createCustomer(connection, {
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      companyName: payload.companyName,
      registrationDate: todayString(),
      status: 'ACTIVE',
    });

    const userId = await createUser(connection, {
      name: payload.name,
      email: payload.email,
      passwordHash,
      role: 'CUSTOMER',
      customerId,
    });

    await writeAuditLog({
      userId,
      action: 'REGISTER',
      entityType: 'USER',
      entityId: userId,
      details: { role: 'CUSTOMER' },
      ipAddress: context.ipAddress,
      connection,
    });

    return findUserById(userId, connection);
  });

  return authResponse(user);
}

export async function login(payload, context = {}) {
  const user = await findUserByEmail(payload.email);

  if (!user || !user.is_active) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  const passwordMatches = await verifyPassword(
    payload.password,
    user.password_hash,
  );

  if (!passwordMatches) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  await updateLastLogin(user.id);
  await writeAuditLog({
    userId: user.id,
    action: 'LOGIN',
    entityType: 'USER',
    entityId: user.id,
    ipAddress: context.ipAddress,
  });

  const refreshedUser = await findUserById(user.id);
  return authResponse(refreshedUser);
}

export async function logout(user, context = {}) {
  await writeAuditLog({
    userId: user.id,
    action: 'LOGOUT',
    entityType: 'USER',
    entityId: user.id,
    ipAddress: context.ipAddress,
  });

  return { message: 'Signed out.' };
}

export async function getCurrentUser(userId) {
  const user = await findUserById(userId);

  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  return publicUser(user);
}

export async function forgotPassword(payload, context = {}) {
  const user = await findUserByEmail(payload.email);

  // Always return the same message so account existence is not exposed.
  if (!user || !user.is_active) {
    return { message: 'If that email exists, a reset link has been sent.' };
  }

  const rawToken = createOpaqueToken();
  const tokenHash = hashOpaqueToken(rawToken);
  const expiresAt = new Date(
    Date.now() + env.resetTokenTtlMinutes * 60 * 1000,
  );
  const resetUrl = `${env.appUrl}/reset-password?token=${rawToken}`;

  await withTransaction(async (connection) => {
    await createPasswordResetToken(connection, {
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    await writeAuditLog({
      userId: user.id,
      action: 'PASSWORD_RESET_REQUEST',
      entityType: 'USER',
      entityId: user.id,
      ipAddress: context.ipAddress,
      connection,
    });
  });

  const delivery = await sendPasswordResetEmail({ user, resetUrl });
  await deleteExpiredPasswordResetTokens().catch(() => {});

  if (!env.isProduction && delivery.mode === 'json') {
    console.log(`[auth:reset-link] ${resetUrl}`);
  }

  return {
    message: 'If that email exists, a reset link has been sent.',
    ...(env.isProduction ? {} : { resetUrl }),
  };
}

export async function resetPassword(payload, context = {}) {
  const tokenHash = hashOpaqueToken(payload.token);
  const resetToken = await findValidPasswordResetToken(tokenHash);

  if (!resetToken) {
    throw new ApiError(400, 'This reset link is invalid or has expired.');
  }

  const passwordHash = await hashPassword(payload.password);

  await withTransaction(async (connection) => {
    await updatePassword(resetToken.user_id, passwordHash, connection);
    await markPasswordResetTokenUsed(connection, resetToken.id);
    await connection.query(
      'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND used_at IS NULL',
      [resetToken.user_id],
    );
    await writeAuditLog({
      userId: resetToken.user_id,
      action: 'PASSWORD_RESET',
      entityType: 'USER',
      entityId: resetToken.user_id,
      ipAddress: context.ipAddress,
      connection,
    });
  });

  return { message: 'Password updated. You can now sign in.' };
}

export async function updateOwnProfile(userId, payload, context = {}) {
  const user = await findUserById(userId);

  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  if (payload.email && payload.email.toLowerCase() !== user.email.toLowerCase()) {
    const existing = await findUserByEmail(payload.email);

    if (existing && existing.id !== user.id) {
      throw new ApiError(409, 'An account with this email already exists.');
    }
  }

  await updateUserProfile(userId, {
    name: payload.name,
    email: payload.email?.toLowerCase(),
  });
  await writeAuditLog({
    userId,
    action: 'UPDATE_PROFILE',
    entityType: 'USER',
    entityId: userId,
    details: { changedFields: Object.keys(payload) },
    ipAddress: context.ipAddress,
  });

  const updated = await findUserById(userId);

  return publicUser(updated);
}

export async function changePassword(userId, payload, context = {}) {
  const user = await findUserById(userId);

  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  const matches = await verifyPassword(
    payload.currentPassword,
    user.password_hash,
  );

  if (!matches) {
    throw new ApiError(400, 'Current password is incorrect.');
  }

  const passwordHash = await hashPassword(payload.newPassword);
  await updatePassword(user.id, passwordHash);
  await writeAuditLog({
    userId: user.id,
    action: 'PASSWORD_CHANGE',
    entityType: 'USER',
    entityId: user.id,
    ipAddress: context.ipAddress,
  });

  return { message: 'Password updated.' };
}

export { publicUser };
