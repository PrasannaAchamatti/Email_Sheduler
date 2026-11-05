import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { checkRedisHealth } from '../config/redis';
import { isEsConnected } from '../integrations/elasticsearch/esClient';

export class HealthController {
  public static async getHealth(req: Request, res: Response) {
    let dbStatus = 'healthy';
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (e: any) {
      dbStatus = `unhealthy: ${e.message}`;
    }

    const redisOk = await checkRedisHealth();
    const esOk = isEsConnected();

    const isAllHealthy = dbStatus === 'healthy' && redisOk;

    res.status(isAllHealthy ? 200 : 503).json({
      status: isAllHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        redis: redisOk ? 'healthy' : 'unhealthy',
        elasticsearch: esOk ? 'healthy' : 'disconnected (graceful fallback active)'
      }
    });
  }
}

