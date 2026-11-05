import { app } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { connectDatabase, prisma } from './config/database';
import { checkRedisHealth, redisClient } from './config/redis';
import { initElasticsearch } from './integrations/elasticsearch/esClient';
import { startEmailWorker, stopEmailWorker } from './workers/emailWorker';
import { reconcileQueueWithDatabase } from './schedulers/reconciliationService';
import { emailQueue } from './queues/emailQueue';

async function bootstrap() {
  try {
    logger.info('Initializing ReachInbox Email Job Scheduler Backend...');

    // 1. Connect to MySQL Database
    await connectDatabase();

    // 2. Verify Redis connection
    const redisHealthy = await checkRedisHealth();
    if (!redisHealthy) {
      throw new Error(`Unable to connect to Redis at ${env.REDIS_HOST}:${env.REDIS_PORT}`);
    }
    logger.info('Redis connection verified successfully');

    // 3. Initialize Elasticsearch (with graceful fallback)
    await initElasticsearch();

    // 4. Start BullMQ Email Worker
    startEmailWorker();

    // 5. Run Startup Reconciliation to recover scheduled emails and resume queue state
    await reconcileQueueWithDatabase();

    // 6. Start HTTP Server
    const server = app.listen(env.PORT, () => {
      logger.info(`=======================================================`);
      logger.info(`🚀 ReachInbox API Server running on port ${env.PORT}`);
      logger.info(`📡 Bull Board Live Queue Dashboard: http://localhost:${env.PORT}/admin/queues`);
      logger.info(`🏥 Health check: http://localhost:${env.PORT}/api/health`);
      logger.info(`=======================================================`);
    });

    // Graceful Shutdown handling
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      server.close(async () => {
        logger.info('HTTP server closed.');
        try {
          await stopEmailWorker();
          await emailQueue.close();
          await redisClient.quit();
          await prisma.$disconnect();
          logger.info('Graceful shutdown complete.');
          process.exit(0);
        } catch (err) {
          logger.error('Error during shutdown:', err);
          process.exit(1);
        }
      });

      // Force shutdown after 10s if hanging
      setTimeout(() => {
        logger.error('Forcefully terminating process after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err: any) {
    logger.error('Fatal error during application startup:', err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap();
}

