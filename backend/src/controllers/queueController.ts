import { Request, Response, NextFunction } from 'express';
import { getQueueMetrics, emailQueue } from '../queues/emailQueue';

export class QueueController {
  public static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await getQueueMetrics();
      res.status(200).json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  }

  public static async pauseQueue(req: Request, res: Response, next: NextFunction) {
    try {
      await emailQueue.pause();
      res.status(200).json({ success: true, message: 'Email queue paused' });
    } catch (err) {
      next(err);
    }
  }

  public static async resumeQueue(req: Request, res: Response, next: NextFunction) {
    try {
      await emailQueue.resume();
      res.status(200).json({ success: true, message: 'Email queue resumed' });
    } catch (err) {
      next(err);
    }
  }
}

