import cron from 'node-cron';
import app from './app.js';
import {
  checkDatabaseConnection,
  closeDatabase,
} from './config/database.js';
import env from './config/env.js';
import { runBillingCycle } from './services/billing.service.js';

let billingTask = null;
let readinessTimer = null;

const server = app.listen(env.port, () => {
  console.log(
    `[server] Brightloop API listening at http://localhost:${env.port}`,
  );
  console.log(
    `[server] Health endpoint: http://localhost:${env.port}/api/health`,
  );
  void reportDatabaseStatus();
});

server.on('error', (error) => {
  console.error('[server] Failed to start:', error.message);
  process.exit(1);
});

function startBillingScheduler() {
  if (billingTask || !env.billing.enabled) {
    return;
  }

  if (!cron.validate(env.billing.cron)) {
    console.warn(
      `[billing] BILLING_CRON "${env.billing.cron}" is not a valid cron expression. Scheduler disabled.`,
    );
    return;
  }

  billingTask = cron.schedule(
    env.billing.cron,
    async () => {
      console.log('[billing] Scheduled billing cycle started.');
      try {
        const summary = await runBillingCycle();
        console.log(
          `[billing] Cycle finished: ${summary.generated.length} generated, ${summary.skipped.length} skipped, ${summary.errors.length} errors.`,
        );
      } catch (error) {
        console.error('[billing] Scheduled cycle failed:', error);
      }
    },
    { timezone: 'UTC' },
  );

  console.log(
    `[billing] Recurring billing scheduler active (${env.billing.cron} UTC).`,
  );
}

async function waitForDatabase(attempt = 1) {
  try {
    await checkDatabaseConnection();
    startBillingScheduler();
  } catch (error) {
    if (attempt === 1) {
      console.warn(
        '[billing] Scheduler waiting for the database before starting.',
      );
    }

    readinessTimer = setTimeout(() => {
      void waitForDatabase(attempt + 1);
    }, 15_000);
    readinessTimer.unref();
  }
}

async function reportDatabaseStatus() {
  try {
    const { latencyMs } = await checkDatabaseConnection();

    console.log(
      `[database] Connected to "${env.db.name}" at ${env.db.host}:${env.db.port} (${latencyMs} ms).`,
    );
    startBillingScheduler();
  } catch (error) {
    console.warn(`[database] Not connected: ${error.code ?? error.message}`);
    console.warn(
      '[database] The API will stay online. /api/health/ready will return 503 until MySQL is reachable.',
    );
    void waitForDatabase();
  }
}

let isShuttingDown = false;

async function shutdown(signal, exitCode = 0) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(`[server] ${signal} received. Shutting down gracefully...`);

  const forceExitTimer = setTimeout(() => {
    console.error('[server] Graceful shutdown timed out.');
    process.exit(1);
  }, 10_000);

  forceExitTimer.unref();

  if (readinessTimer) {
    clearTimeout(readinessTimer);
  }

  if (billingTask) {
    billingTask.stop();
    console.log('[billing] Scheduler stopped.');
  }

  server.close(async (closeError) => {
    if (closeError) {
      console.error('[server] Error while closing the HTTP server:', closeError);
    }

    try {
      await closeDatabase();
      console.log('[database] Connection pool closed.');
    } catch (databaseError) {
      console.error('[database] Failed to close connection pool:', databaseError);
    }

    clearTimeout(forceExitTimer);
    process.exit(exitCode);
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  console.error('[process] Unhandled promise rejection:', reason);
  void shutdown('unhandledRejection', 1);
});

process.on('uncaughtException', (error) => {
  console.error('[process] Uncaught exception:', error);
  void shutdown('uncaughtException', 1);
});
