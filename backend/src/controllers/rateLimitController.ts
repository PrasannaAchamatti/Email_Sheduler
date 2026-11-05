import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { RateLimitService } from '../services/rateLimitService';

export class RateLimitController {
  public static async getRateLimits(req: Request, res: Response, next: NextFunction) {
    try {
      const senders = await prisma.sender.findMany({
        where: { userId: req.user!.userId, isActive: true }
      });

      const limits = await Promise.all(
        senders.map(async (sender) => {
          const usage = await RateLimitService.getSenderHourlyUsage(sender.id);
          return {
            ...usage,
            senderName: sender.name,
            senderEmail: sender.email
          };
        })
      );

      res.status(200).json({ success: true, data: limits });
    } catch (err) {
      next(err);
    }
  }

  public static async getSenderRateLimit(req: Request, res: Response, next: NextFunction) {
    try {
      const sender = await prisma.sender.findFirst({
        where: { id: req.params.senderId, userId: req.user!.userId }
      });

      if (!sender) {
        return res.status(404).json({ success: false, error: 'Sender not found' });
      }

      const usage = await RateLimitService.getSenderHourlyUsage(sender.id);
      res.status(200).json({
        success: true,
        data: {
          ...usage,
          senderName: sender.name,
          senderEmail: sender.email
        }
      });
    } catch (err) {
      next(err);
    }
  }

  public static async resetRateLimit(req: Request, res: Response, next: NextFunction) {
    try {
      const { senderId } = req.params;
      const sender = await prisma.sender.findFirst({
        where: { id: senderId, userId: req.user!.userId }
      });

      if (!sender) {
        return res.status(404).json({ success: false, error: 'Sender not found' });
      }

      await RateLimitService.resetSenderHourlyUsage(senderId);
      res.status(200).json({ success: true, message: 'Sender hourly rate limit counter reset' });
    } catch (err) {
      next(err);
    }
  }
}

