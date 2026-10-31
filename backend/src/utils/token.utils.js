import jwt from 'jsonwebtoken';
import env from '../config/env.js';

export function signAccessToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      role: user.role,
      customerId: user.customer_id ? String(user.customer_id) : null,
    },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn },
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.secret);
}
