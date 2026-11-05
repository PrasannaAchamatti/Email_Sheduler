import { prisma } from '../config/database';
import { emailQueue } from '../queues/emailQueue';
import { logger } from '../config/logger';
import { getBullJobId } from '../utils/idempotency';

/**
 * Reconcile database emails with BullMQ queue jobs on application startup.
 * Ensures no scheduled emails are lost across restarts, and no sent emails are re-sent.
 */
export async function reconcileQueueWithDatabase(): Promise<{
  recoveredCount: number;
  skippedCount: number;
}> {
  logger.info('Starting database & queue startup reconciliation...');
  let recoveredCount = 0;
  let skippedCount = 0;

  try {
    // 1. Find all emails in 'scheduled', 'waiting', or 'processing' states
    // Note: If an email was marked 'processing' when the server died, we treat it carefully:
    // If it has no sent timestamp and was in 'processing' before restart, we check its status
    const pendingEmails = await prisma.email.findMany({
      where: {
        status: { in: ['scheduled', 'waiting', 'processing'] }
      },
      include: {
        sender: true,
        campaign: true
      }
    });

    logger.info(`Found ${pendingEmails.length} pending emails in database to reconcile.`);

    for (const email of pendingEmails) {
      const jobId = getBullJobId(email.id);

      // Check if job already exists in BullMQ (waiting, active, delayed)
      const existingJob = await emailQueue.getJob(jobId);

      if (existingJob) {
        const state = await existingJob.getState();
        if (state === 'completed') {
          // If the job completed in Redis but DB didn't update before crash:
          logger.info(`Job ${jobId} was already completed in queue. Marking DB as sent.`);
          await prisma.email.update({
            where: { id: email.id },
            data: { status: 'sent', sentAt: new Date() }
          });
          skippedCount++;
          continue;
        }

        if (state === 'failed') {
          skippedCount++;
          continue;
        }

        // Job is already in queue (delayed or waiting), leave it alone!
        skippedCount++;
        continue;
      }

      // If no job exists in queue, we must recreate it idempotently!
      const now = Date.now();
      const scheduledTime = new Date(email.scheduledAt).getTime();
      const delay = Math.max(0, scheduledTime - now);

      await emailQueue.add(
        'send-email',
        {
          emailId: email.id,
          userId: email.userId,
          campaignId: email.campaignId,
          senderId: email.senderId,
          recipient: email.recipient,
          subject: email.subject,
          body: email.body,
          scheduledAt: email.scheduledAt.toISOString()
        },
        {
          jobId,
          delay
        }
      );

      // Reset 'processing' status back to 'scheduled' if it was interrupted mid-flight
      if (email.status === 'processing') {
        await prisma.email.update({
          where: { id: email.id },
          data: { status: 'scheduled' }
        });
      }

      recoveredCount++;
    }

    logger.info(
      `Startup reconciliation completed: ${recoveredCount} jobs recovered into queue, ${skippedCount} existing jobs preserved.`
    );

    return { recoveredCount, skippedCount };
  } catch (err: any) {
    logger.error('Error during startup reconciliation:', err);
    return { recoveredCount, skippedCount };
  }
}

