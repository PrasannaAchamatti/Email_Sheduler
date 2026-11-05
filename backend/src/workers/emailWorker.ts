import { Worker, Job } from 'bullmq';
import { EMAIL_QUEUE_NAME, EmailJobData, emailQueue } from '../queues/emailQueue';
import { redisOptions } from '../config/redis';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { prisma } from '../config/database';
import { RateLimitService } from '../services/rateLimitService';
import { sendEmailThroughSmtp, SmtpConfig } from '../integrations/smtp/smtpTransporter';
import { decrypt } from '../utils/encryption';
import { updateEmailStatusInElastic } from '../integrations/elasticsearch/esClient';
import { sendSlackRateLimitAlert } from '../integrations/slack/slackClient';
import { getBullJobId } from '../utils/idempotency';

export let emailWorker: Worker<EmailJobData> | null = null;

export function startEmailWorker(): Worker<EmailJobData> {
  if (emailWorker) {
    return emailWorker;
  }

  const concurrency = env.WORKER_CONCURRENCY || 5;
  logger.info(`Starting BullMQ Email Worker with concurrency: ${concurrency}`);

  emailWorker = new Worker<EmailJobData>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobData>) => {
      const { emailId, userId, campaignId, senderId, recipient, subject, body } = job.data;
      logger.info(`Worker processing job ${job.id} for email ${emailId} to ${recipient}`);

      // 1. Check current email status in DB for idempotency
      const emailRecord = await prisma.email.findUnique({
        where: { id: emailId },
        include: { sender: true, campaign: true }
      });

      if (!emailRecord) {
        logger.warn(`Email record ${emailId} not found in database. Skipping job.`);
        return { skipped: true, reason: 'Record not found' };
      }

      if (emailRecord.status === 'sent') {
        logger.info(`Email ${emailId} already marked as 'sent' in database. Skipping to prevent duplicate send.`);
        return { skipped: true, reason: 'Already sent' };
      }

      if (emailRecord.status === 'cancelled') {
        logger.info(`Email ${emailId} was cancelled by user. Skipping.`);
        return { skipped: true, reason: 'Cancelled' };
      }

      // 2. Minimum Inter-Send Delay check
      const minDelayCheck = await RateLimitService.checkMinimumDelay(senderId, env.MIN_DELAY_BETWEEN_EMAILS_MS);
      if (!minDelayCheck.allowed && minDelayCheck.waitMs > 0) {
        logger.info(`Sender ${senderId} requires ${minDelayCheck.waitMs}ms delay. Sleeping before send.`);
        await new Promise((resolve) => setTimeout(resolve, minDelayCheck.waitMs));
      }

      // 3. Hourly Rate Limit Check
      const campaignHourlyLimit = emailRecord.campaign?.hourlyLimit || env.MAX_EMAILS_PER_HOUR_PER_SENDER;
      const rateLimitCheck = await RateLimitService.checkAndIncrementHourly(senderId, campaignHourlyLimit);

      if (!rateLimitCheck.allowed) {
        logger.warn(
          `Sender ${senderId} hit hourly rate limit (${rateLimitCheck.currentCount}/${rateLimitCheck.maxLimit}) for window ${rateLimitCheck.hourWindow}. Rescheduling job.`
        );

        // Update DB status to waiting (rescheduled)
        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: 'waiting',
            errorMessage: `Hourly limit reached (${rateLimitCheck.maxLimit}/hr). Rescheduled for next hour window at ${rateLimitCheck.nextWindowStart.toISOString()}`
          }
        });

        // Record RateLimitEvent in database
        const shouldAlertSlack = await RateLimitService.shouldTriggerSlackAlert(senderId, rateLimitCheck.hourWindow);

        await prisma.rateLimitEvent.create({
          data: {
            senderId,
            userId,
            hourWindow: rateLimitCheck.hourWindow,
            currentCount: rateLimitCheck.currentCount,
            maxLimit: rateLimitCheck.maxLimit,
            slackNotificationSent: shouldAlertSlack
          }
        });

        // Trigger real Slack notification if Slack is connected
        if (shouldAlertSlack) {
          try {
            const slackIntegration = await prisma.slackIntegration.findUnique({
              where: { userId }
            });

            if (slackIntegration && slackIntegration.connected && slackIntegration.accessTokenEncrypted) {
              const decryptedToken = decrypt(slackIntegration.accessTokenEncrypted);
              await sendSlackRateLimitAlert(decryptedToken, slackIntegration.channelId || undefined, {
                senderEmail: emailRecord.sender.email,
                hourlyLimit: rateLimitCheck.maxLimit,
                currentCount: rateLimitCheck.currentCount,
                hourWindow: rateLimitCheck.hourWindow,
                campaignSubject: emailRecord.campaign?.subject,
                campaignId: emailRecord.campaignId || undefined,
                resumeTime: rateLimitCheck.nextWindowStart
              });
            }
          } catch (slackErr: any) {
            logger.error('Error dispatching Slack rate limit notification:', slackErr);
          }
        }

        // Reschedule BullMQ delayed job for the next hour window
        const nextDelayMs = Math.max(1000, rateLimitCheck.delayUntilNextWindowMs);
        await emailQueue.add(
          'send-email',
          {
            ...job.data,
            attemptNumber: (job.data.attemptNumber || 0) + 1
          },
          {
            delay: nextDelayMs,
            jobId: `${getBullJobId(emailId)}_rescheduled_${Date.now()}`
          }
        );

        return {
          rescheduled: true,
          nextWindowStart: rateLimitCheck.nextWindowStart
        };
      }

      // 4. Mark status as 'processing' in DB
      await prisma.email.update({
        where: { id: emailId },
        data: {
          status: 'processing',
          attempts: { increment: 1 }
        }
      });

      // 5. Send Email via SMTP
      const sender = emailRecord.sender;
      const decryptedPassword = decrypt(sender.smtpPasswordEncrypted);

      const smtpConfig: SmtpConfig = {
        host: sender.smtpHost,
        port: sender.smtpPort,
        user: sender.smtpUser,
        pass: decryptedPassword,
        isEthereal: sender.isEthereal
      };

      const sendResult = await sendEmailThroughSmtp(smtpConfig, {
        emailId,
        fromName: sender.name,
        fromEmail: sender.email,
        to: recipient,
        subject,
        body
      });

      // Record successful send timestamp for minimum delay enforcement
      await RateLimitService.recordSendTimestamp(senderId);

      if (sendResult.success) {
        // 6. Update database record to 'sent'
        const updatedEmail = await prisma.email.update({
          where: { id: emailId },
          data: {
            status: 'sent',
            sentAt: new Date(),
            messageId: sendResult.messageId,
            etherealPreviewUrl: sendResult.previewUrl,
            errorMessage: null
          }
        });

        // Update campaign counts
        if (campaignId) {
          const updatedCampaign = await prisma.campaign.update({
            where: { id: campaignId },
            data: {
              sentCount: { increment: 1 }
            }
          });

          // Check if campaign is completed
          if (updatedCampaign.sentCount + updatedCampaign.failedCount >= updatedCampaign.totalRecipients) {
            await prisma.campaign.update({
              where: { id: campaignId },
              data: { status: 'completed' }
            });
          } else {
            await prisma.campaign.update({
              where: { id: campaignId },
              data: { status: 'processing' }
            });
          }
        }

        // Update Elasticsearch document
        await updateEmailStatusInElastic(emailId, {
          status: 'sent',
          sentAt: updatedEmail.sentAt,
          etherealPreviewUrl: sendResult.previewUrl,
          attempts: updatedEmail.attempts
        });

        return {
          success: true,
          emailId,
          messageId: sendResult.messageId,
          previewUrl: sendResult.previewUrl
        };
      } else {
        // Send failed
        const isFinalAttempt = (job.attemptsMade || 0) + 1 >= (job.opts.attempts || 3);

        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: isFinalAttempt ? 'failed' : 'waiting',
            errorMessage: sendResult.errorMessage
          }
        });

        if (isFinalAttempt && campaignId) {
          await prisma.campaign.update({
            where: { id: campaignId },
            data: { failedCount: { increment: 1 } }
          });
        }

        // Update Elasticsearch
        await updateEmailStatusInElastic(emailId, {
          status: isFinalAttempt ? 'failed' : 'waiting',
          errorMessage: sendResult.errorMessage
        });

        // Throw error to trigger BullMQ retry if not final attempt
        throw new Error(sendResult.errorMessage || 'Failed to send email through SMTP');
      }
    },
    {
      connection: redisOptions,
      concurrency
    }
  );

  emailWorker.on('completed', (job) => {
    logger.info(`Job ${job.id} completed successfully`);
  });

  emailWorker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} failed with error: ${err.message}`);
  });

  emailWorker.on('error', (err) => {
    logger.error('Email Worker unhandled error:', err);
  });

  return emailWorker;
}

export async function stopEmailWorker(): Promise<void> {
  if (emailWorker) {
    logger.info('Stopping BullMQ Email Worker gracefully...');
    await emailWorker.close();
    emailWorker = null;
  }
}

