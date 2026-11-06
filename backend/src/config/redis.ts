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

// If cloud REDIS_URL is provided (e.g. on Railway, Upstash, Render), parse it
if (env.REDIS_URL) {
  try {
    const parsed = new URL(env.REDIS_URL);
    redisOptions.host = parsed.hostname;
    redisOptions.port = parseInt(parsed.port, 10) || 6379;
    if (parsed.password) {
      redisOptions.password = decodeURIComponent(parsed.password);
    }
    if (parsed.username && parsed.username !== 'default') {
      redisOptions.username = decodeURIComponent(parsed.username);
    }
    if (parsed.protocol === 'rediss:') {
      redisOptions.tls = {
        rejectUnauthorized: false
      };
    }
  } catch (err: any) {
    logger.error('Failed to parse REDIS_URL:', err.message);
  }
}

export const redisClient = env.REDIS_URL
  ? new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      tls: env.REDIS_URL.startsWith('rediss:') ? { rejectUnauthorized: false } : undefined
    })
  : new Redis(redisOptions);

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

