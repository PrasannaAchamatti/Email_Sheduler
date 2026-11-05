import Redis, { RedisOptions } from 'ioredis';
import { env } from './env';
import { logger } from './logger';

export const redisOptions: RedisOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 3000);
    logger.warn(`Redis reconnecting in ${delay}ms... (attempt ${times})`);
    return delay;
  }
};

export const redisClient = new Redis(redisOptions);

redisClient.on('connect', () => {
  logger.info(`Redis client connected to ${env.REDIS_HOST}:${env.REDIS_PORT}`);
});

redisClient.on('error', (err) => {
  logger.error('Redis connection error:', err.message);
});

export async function checkRedisHealth(): Promise<boolean> {
  try {
    const pong = await redisClient.ping();
    return pong === 'PONG';
  } catch (err) {
    logger.error('Redis health check failed:', err);
    return false;
  }
}

