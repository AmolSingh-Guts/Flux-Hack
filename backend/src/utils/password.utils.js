import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import env from '../config/env.js';

export function hashPassword(password) {
  return bcrypt.hash(password, env.bcryptRounds);
}

export function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export function createOpaqueToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function hashOpaqueToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
