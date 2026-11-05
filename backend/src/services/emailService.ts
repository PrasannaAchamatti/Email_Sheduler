import { prisma } from '../config/database';
import { emailQueue } from '../queues/emailQueue';
import { env } from '../config/env';
import { logger } from '../config/logger';
import {
  generateEmailIdempotencyKey,
  getBullJobId
} from '../utils/idempotency';
import { indexEmailDocument } from '../integrations/elasticsearch/esClient';

export interface ScheduleCampaignInput {
  subject: string;
  body: string;
  recipients: string[];
  startDate: string;
  startTime: string;
  delayBetweenEmails?: number; // ms
  hourlyLimit?: number;
  senderId: string;
}

export class EmailService {
  /**
   * Schedule campaign and enqueue individual recipient email jobs
   */
  public static async scheduleCampaign(userId: string, input: ScheduleCampaignInput) {
    if (!input.recipients || input.recipients.length === 0) {
      throw new Error('At least one recipient email address is required');
    }

    // Verify sender exists and belongs to user
    const sender = await prisma.sender.findFirst({
      where: { id: input.senderId, userId }
    });

    if (!sender) {
      throw new Error('Sender not found or does not belong to this user');
    }

    // Parse start datetime
    let baseTime = new Date(`${input.startDate}T${input.startTime}:00`);
    if (isNaN(baseTime.getTime())) {
      baseTime = new Date(); // fallback to current time
    }

    const now = Date.now();
    // If scheduled time is in the past, start now
    if (baseTime.getTime() < now) {
      baseTime = new Date(now + 1000);
    }

    const delayBetweenEmails = input.delayBetweenEmails && input.delayBetweenEmails >= 500
      ? input.delayBetweenEmails
      : env.MIN_DELAY_BETWEEN_EMAILS_MS;

    const hourlyLimit = input.hourlyLimit && input.hourlyLimit > 0
      ? input.hourlyLimit
      : env.MAX_EMAILS_PER_HOUR_PER_SENDER;

    // 1. Create Campaign record
    const campaign = await prisma.campaign.create({
      data: {
        userId,
        subject: input.subject,
        body: input.body,
        startTime: baseTime,
        delayBetweenEmails,
        hourlyLimit,
        status: 'scheduled',
        totalRecipients: input.recipients.length,
        sentCount: 0,
        failedCount: 0
      }
    });

    logger.info(`Created Campaign ${campaign.id} with ${input.recipients.length} recipients`);

    const scheduledEmails = [];
    const queueJobs = [];

    // 2. Create individual email records and queue jobs
    for (let i = 0; i < input.recipients.length; i++) {
      const recipient = input.recipients[i].toLowerCase().trim();
      const scheduledAt = new Date(baseTime.getTime() + (i * delayBetweenEmails));
      const idempotencyKey = generateEmailIdempotencyKey(
        userId,
        recipient,
        input.subject,
        scheduledAt,
        campaign.id
      );

      // Create Email in DB
      const email = await prisma.email.create({
        data: {
          campaignId: campaign.id,
          userId,
          senderId: sender.id,
          recipient,
          subject: input.subject,
          body: input.body,
          scheduledAt,
          status: 'scheduled',
          idempotencyKey,
          bullJobId: getBullJobId(idempotencyKey)
        }
      });

      scheduledEmails.push(email);

      // Calculate initial delay for BullMQ job
      const initialDelay = Math.max(0, scheduledAt.getTime() - Date.now());
      const jobId = getBullJobId(email.id);

      queueJobs.push({
        name: 'send-email',
        data: {
          emailId: email.id,
          userId,
          campaignId: campaign.id,
          senderId: sender.id,
          recipient,
          subject: input.subject,
          body: input.body,
          scheduledAt: scheduledAt.toISOString()
        },
        opts: {
          jobId,
          delay: initialDelay
        }
      });

      // Asynchronously index in Elasticsearch
      indexEmailDocument({
        id: email.id,
        userId,
        campaignId: campaign.id,
        senderId: sender.id,
        senderEmail: sender.email,
        senderName: sender.name,
        recipient,
        subject: input.subject,
        body: input.body,
        status: 'scheduled',
        scheduledAt,
        createdAt: email.createdAt,
        updatedAt: email.updatedAt
      }).catch((err) => logger.warn(`ES indexing deferred for email ${email.id}:`, err.message));
    }

    // Add jobs to BullMQ in bulk
    await emailQueue.addBulk(queueJobs);

    logger.info(`Enqueued ${queueJobs.length} BullMQ jobs for campaign ${campaign.id}`);

    return {
      campaignId: campaign.id,
      totalRecipients: input.recipients.length,
      startTime: baseTime,
      status: campaign.status,
      firstScheduledAt: scheduledEmails[0]?.scheduledAt,
      lastScheduledAt: scheduledEmails[scheduledEmails.length - 1]?.scheduledAt
    };
  }

  /**
   * Get scheduled emails for a user
   */
  public static async getScheduledEmails(
    userId: string,
    params: {
      page?: number;
      limit?: number;
      status?: string;
      search?: string;
      startDate?: string;
      endDate?: string;
    }
  ) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      userId,
      status: { in: ['scheduled', 'waiting', 'processing'] }
    };

    if (params.status && params.status !== 'all') {
      where.status = params.status;
    }

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { recipient: { contains: q } },
        { subject: { contains: q } }
      ];
    }

    if (params.startDate || params.endDate) {
      where.scheduledAt = {};
      if (params.startDate) where.scheduledAt.gte = new Date(params.startDate);
      if (params.endDate) where.scheduledAt.lte = new Date(params.endDate);
    }

    const [total, emails] = await Promise.all([
      prisma.email.count({ where }),
      prisma.email.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledAt: 'asc' },
        include: {
          sender: { select: { id: true, name: true, email: true } },
          campaign: { select: { id: true, subject: true } }
        }
      })
    ]);

    return {
      data: emails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get sent and failed emails for a user
   */
  public static async getSentEmails(
    userId: string,
    params: {
      page?: number;
      limit?: number;
      status?: string;
      search?: string;
      startDate?: string;
      endDate?: string;
    }
  ) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      userId,
      status: { in: ['sent', 'failed'] }
    };

    if (params.status && params.status !== 'all') {
      where.status = params.status;
    }

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { recipient: { contains: q } },
        { subject: { contains: q } }
      ];
    }

    if (params.startDate || params.endDate) {
      where.sentAt = {};
      if (params.startDate) where.sentAt.gte = new Date(params.startDate);
      if (params.endDate) where.sentAt.lte = new Date(params.endDate);
    }

    const [total, emails] = await Promise.all([
      prisma.email.count({ where }),
      prisma.email.findMany({
        where,
        skip,
        take: limit,
        orderBy: { sentAt: 'desc' },
        include: {
          sender: { select: { id: true, name: true, email: true } },
          campaign: { select: { id: true, subject: true } }
        }
      })
    ]);

    return {
      data: emails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Cancel an email job
   */
  public static async cancelEmail(emailId: string, userId: string) {
    const email = await prisma.email.findFirst({
      where: { id: emailId, userId }
    });

    if (!email) {
      throw new Error('Email not found or unauthorized');
    }

    if (email.status === 'sent') {
      throw new Error('Cannot cancel an email that has already been sent');
    }

    // 1. Update status in DB
    const updated = await prisma.email.update({
      where: { id: emailId },
      data: { status: 'cancelled' }
    });

    // 2. Remove job from BullMQ queue if present
    const jobId = getBullJobId(emailId);
    const job = await emailQueue.getJob(jobId);
    if (job) {
      await job.remove();
      logger.info(`Removed BullMQ job ${jobId} for cancelled email ${emailId}`);
    }

    return updated;
  }

  /**
   * Get email details by ID
   */
  public static async getEmailById(emailId: string, userId: string) {
    const email = await prisma.email.findFirst({
      where: { id: emailId, userId },
      include: {
        sender: { select: { id: true, name: true, email: true, isEthereal: true } },
        campaign: true
      }
    });

    if (!email) {
      throw new Error('Email not found or unauthorized');
    }

    return email;
  }
}

