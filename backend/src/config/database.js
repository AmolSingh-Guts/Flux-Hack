import mysql from 'mysql2/promise';
import env from './env.js';

/**
 * A single connection pool is shared by the whole process.
 * mysql2 queues queries while a connection is being created, so the API can
 * start before MySQL is available and report its status through readiness.
 */
const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  waitForConnections: true,
  connectionLimit: env.db.connectionLimit,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: 'Z',
  dateStrings: true,
  namedPlaceholders: true,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

export async function checkDatabaseConnection() {
  const startedAt = performance.now();
  const [rows] = await pool.query('SELECT 1 AS connected');

  return {
    connected: Number(rows[0]?.connected) === 1,
    latencyMs: Math.round(performance.now() - startedAt),
  };
}

export async function withTransaction(callback) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function closeDatabase() {
  await pool.end();
}

export default pool;
