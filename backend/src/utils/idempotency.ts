import crypto from 'crypto';

/**
 * Generate a deterministic idempotency key for an email item
 */
export function generateEmailIdempotencyKey(
  userId: string,
  recipient: string,
  subject: string,
  scheduledTime: Date | string,
  campaignId?: string
): string {
  const timeString = scheduledTime instanceof Date ? scheduledTime.toISOString() : scheduledTime;
  const raw = `${userId}:${campaignId || 'direct'}:${recipient.toLowerCase().trim()}:${subject}:${timeString}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Generate deterministic BullMQ Job ID
 */
export function getBullJobId(emailId: string): string {
  return `job_email_${emailId}`;
}

/**
 * Generate deterministic SMTP Message-ID header
 */
export function generateDeterministicMessageId(emailId: string, domain = 'reachinbox.app'): string {
  return `<reachinbox.${emailId}@${domain}>`;
}

