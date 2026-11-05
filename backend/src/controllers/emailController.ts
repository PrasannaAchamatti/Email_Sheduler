import { Request, Response, NextFunction } from 'express';
import { EmailService } from '../services/emailService';
import { parseRecipientsContent } from '../utils/csvParser';
import { searchEmailsInElastic } from '../integrations/elasticsearch/esClient';
import { prisma } from '../config/database';

export class EmailController {
  public static async scheduleCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await EmailService.scheduleCampaign(req.user!.userId, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async uploadRecipients(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      const result = parseRecipientsContent(req.file.buffer);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async getScheduledEmails(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await EmailService.getScheduledEmails(req.user!.userId, req.query as any);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async getSentEmails(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await EmailService.getSentEmails(req.user!.userId, req.query as any);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  public static async getEmailById(req: Request, res: Response, next: NextFunction) {
    try {
      const email = await EmailService.getEmailById(req.params.id, req.user!.userId);
      res.status(200).json({ success: true, data: email });
    } catch (err) {
      next(err);
    }
  }

  public static async cancelEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await EmailService.cancelEmail(req.params.id, req.user!.userId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async searchEmails(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { q, status, startDate, endDate, page, limit } = req.query as any;

      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = parseInt(limit as string, 10) || 20;

      // 1. Try Elasticsearch first
      const esResult = await searchEmailsInElastic({
        userId,
        query: q as string,
        status: status as string,
        startDate: startDate as string,
        endDate: endDate as string,
        page: pageNum,
        limit: limitNum
      });

      if (esResult) {
        return res.status(200).json({ success: true, ...esResult });
      }

      // 2. Database fallback if Elasticsearch is unavailable
      const where: any = { userId };

      if (status && status !== 'all') {
        where.status = status;
      }

      if (startDate || endDate) {
        where.scheduledAt = {};
        if (startDate) where.scheduledAt.gte = new Date(startDate);
        if (endDate) where.scheduledAt.lte = new Date(endDate);
      }

      if (q && q.trim()) {
        const queryTerm = q.trim();
        where.OR = [
          { recipient: { contains: queryTerm } },
          { subject: { contains: queryTerm } },
          { body: { contains: queryTerm } }
        ];
      }

      const [total, emails] = await Promise.all([
        prisma.email.count({ where }),
        prisma.email.findMany({
          where,
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
          orderBy: { scheduledAt: 'desc' },
          include: {
            sender: { select: { id: true, name: true, email: true } },
            campaign: { select: { id: true, subject: true } }
          }
        })
      ]);

      const formatted = emails.map((e) => ({
        id: e.id,
        userId: e.userId,
        campaignId: e.campaignId,
        senderId: e.senderId,
        senderEmail: e.sender?.email || '',
        senderName: e.sender?.name || '',
        recipient: e.recipient,
        subject: e.subject,
        body: e.body,
        status: e.status,
        scheduledAt: e.scheduledAt,
        sentAt: e.sentAt,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
        etherealPreviewUrl: e.etherealPreviewUrl,
        errorMessage: e.errorMessage
      }));

      return res.status(200).json({
        success: true,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        results: formatted,
        source: 'database'
      });
    } catch (err) {
      next(err);
    }
  }
}

