import env from '../config/env.js';
import { checkDatabaseConnection } from '../config/database.js';
import asyncHandler from '../utils/asyncHandler.js';

function serviceMetadata() {
  return {
    service: 'brightloop-api',
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  };
}

export const getHealth = (request, response) => {
  response.status(200).json({
    success: true,
    status: 'ok',
    data: serviceMetadata(),
  });
};

export const getReadiness = asyncHandler(async (request, response) => {
  try {
    const database = await checkDatabaseConnection();

    return response.status(200).json({
      success: true,
      status: 'ready',
      data: {
        ...serviceMetadata(),
        checks: {
          database: {
            status: 'up',
            latencyMs: database.latencyMs,
          },
        },
      },
    });
  } catch (error) {
    console.error('[database:readiness]', error.message);

    return response.status(503).json({
      success: false,
      status: 'degraded',
      message: 'The API is running, but the database is unavailable.',
      data: {
        ...serviceMetadata(),
        checks: {
          database: {
            status: 'down',
          },
        },
      },
    });
  }
});
