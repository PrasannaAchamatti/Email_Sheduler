import { Queue } from 'bullmq';
import { redisOptions } from '../config/redis';
import { logger } from '../config/logger';

export const EMAIL_QUEUE_NAME = 'reachinbox-email-queue';

export interface EmailJobData {
  emailId: string;
  userId: string;
  campaignId?: string | null;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  attemptNumber?: number;
}

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: redisOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: {
      age: 24 * 3600, // keep completed jobs for 24h for Bull Board inspection
      count: 2000
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // keep failed jobs for 7 days
      count: 5000
    }
  }
});

emailQueue.on('error', (err) => {
  logger.error('Email Queue error:', err);
});

export async function getQueueMetrics() {
  const [waiting, active, delayed, completed, failed, isPaused] = await Promise.all([
    emailQueue.getWaitingCount(),
    emailQueue.getActiveCount(),
    emailQueue.getDelayedCount(),
    emailQueue.getCompletedCount(),
    emailQueue.getFailedCount(),
    emailQueue.isPaused()
  ]);

  return {
    queueName: EMAIL_QUEUE_NAME,
    waiting,
    active,
    delayed,
    completed,
    failed,
    isPaused,
    total: waiting + active + delayed + completed + failed
  };
}

