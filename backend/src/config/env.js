import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

// Load backend/.env regardless of the directory the process is started from.
// Values already supplied by the shell (for example during tests) win.
dotenv.config({
  path: path.resolve(currentDirectory, '../../.env'),
  quiet: true,
});

function readPositiveInteger(value, fallback, name) {
  if (value === undefined || value.trim() === '') {
    return fallback;
  }

  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsedValue;
}

function readBoolean(value, fallback) {
  if (value === undefined || value.trim() === '') {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function readList(value, fallback = []) {
  if (!value?.trim()) {
    return fallback;
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const nodeEnv = process.env.NODE_ENV?.trim() || 'development';
const isProduction = nodeEnv === 'production';
const jwtSecret =
  process.env.JWT_SECRET?.trim() ||
  'development-only-secret-change-before-production';

if (isProduction && jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production.');
}

const env = Object.freeze({
  nodeEnv,
  isProduction,
  isTest: nodeEnv === 'test',
  port: readPositiveInteger(process.env.PORT, 4000, 'PORT'),
  clientOrigins: readList(process.env.CLIENT_ORIGIN, [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ]),
  appUrl: process.env.APP_URL?.trim() || 'http://127.0.0.1:5173',
  jwt: Object.freeze({
    secret: jwtSecret,
    expiresIn: process.env.JWT_EXPIRES_IN?.trim() || '8h',
  }),
  bcryptRounds: readPositiveInteger(process.env.BCRYPT_ROUNDS, 12, 'BCRYPT_ROUNDS'),
  resetTokenTtlMinutes: readPositiveInteger(
    process.env.RESET_TOKEN_TTL_MINUTES,
    60,
    'RESET_TOKEN_TTL_MINUTES',
  ),
  db: Object.freeze({
    host: process.env.DB_HOST?.trim() || '127.0.0.1',
    port: readPositiveInteger(process.env.DB_PORT, 3306, 'DB_PORT'),
    user: process.env.DB_USER?.trim() || 'root',
    password: process.env.DB_PASSWORD ?? '',
    name:
      nodeEnv === 'test'
        ? process.env.TEST_DB_NAME?.trim() || 'brightloop_subscription_db_test'
        : process.env.DB_NAME?.trim() || 'brightloop_subscriptions',
    connectionLimit: readPositiveInteger(
      process.env.DB_CONNECTION_LIMIT,
      10,
      'DB_CONNECTION_LIMIT',
    ),
  }),
  mail: Object.freeze({
    host: process.env.SMTP_HOST?.trim() || '',
    port: readPositiveInteger(process.env.SMTP_PORT, 587, 'SMTP_PORT'),
    secure: readBoolean(process.env.SMTP_SECURE, false),
    user: process.env.SMTP_USER?.trim() || '',
    pass: process.env.SMTP_PASS ?? '',
    from:
      process.env.MAIL_FROM?.trim() ||
      'Brightloop Software <no-reply@brightloop.test>',
  }),
  billing: Object.freeze({
    enabled: readBoolean(process.env.BILLING_CRON_ENABLED, true),
    cron: process.env.BILLING_CRON?.trim() || '0 2 * * *',
  }),
  currency: process.env.CURRENCY?.trim() || 'INR',
});

export default env;
