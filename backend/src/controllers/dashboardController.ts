import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { getQueueMetrics } from '../queues/emailQueue';
import { RateLimitService } from '../services/rateLimitService';

export class DashboardController {
  public static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;

      // 1. Database Email counts
      const [
        totalEmails,
        scheduledEmails,
        sentEmails,
        failedEmails,
        waitingEmails,
        processingEmails,
        recentEmails,
        senders
      ] = await Promise.all([
        prisma.email.count({ where: { userId } }),
        prisma.email.count({ where: { userId, status: 'scheduled' } }),
        prisma.email.count({ where: { userId, status: 'sent' } }),
        prisma.email.count({ where: { userId, status: 'failed' } }),
        prisma.email.count({ where: { userId, status: 'waiting' } }),
        prisma.email.count({ where: { userId, status: 'processing' } }),
        prisma.email.findMany({
          where: { userId },
          take: 8,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: { select: { name: true, email: true } },
            campaign: { select: { subject: true } }
          }
        }),
        prisma.sender.findMany({
          where: { userId, isActive: true },
          select: { id: true, name: true, email: true }
        })
      ]);

      // 2. BullMQ live queue metrics
      const queueMetrics = await getQueueMetrics();

      // 3. Rate limit usage per sender
      const rateLimits = await Promise.all(
        senders.map((s) => RateLimitService.getSenderHourlyUsage(s.id))
      );

      res.status(200).json({
        success: true,
        data: {
          metrics: {
            totalEmails,
            scheduledEmails,
            sentEmails,
            failedEmails,
            pendingEmails: scheduledEmails + waitingEmails + processingEmails,
            activeQueueJobs: queueMetrics.active,
            waitingQueueJobs: queueMetrics.waiting,
            delayedQueueJobs: queueMetrics.delayed
          },
          queue: queueMetrics,
          rateLimits: senders.map((s, idx) => ({
            ...rateLimits[idx],
            senderName: s.name,
            senderEmail: s.email
          })),
          recentEmails
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

