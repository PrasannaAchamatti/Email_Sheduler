import nodemailer, { Transporter } from 'nodemailer';
import { decrypt } from '../../utils/encryption';
import { logger } from '../../config/logger';
import { generateDeterministicMessageId } from '../../utils/idempotency';

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  isEthereal?: boolean;
}

export interface SendEmailPayload {
  emailId: string;
  fromName: string;
  fromEmail: string;
  to: string;
  subject: string;
  body: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  previewUrl?: string;
  errorMessage?: string;
}

// In-memory pool of transporters keyed by host:port:user
const transporterPool = new Map<string, Transporter>();

function getPoolKey(config: SmtpConfig): string {
  return `${config.host}:${config.port}:${config.user}`;
}

export function createTransporter(config: SmtpConfig): Transporter {
  const key = getPoolKey(config);
  const existing = transporterPool.get(key);
  if (existing) {
    return existing;
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass
    },
    // Pool options for high-throughput
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 10
  });

  transporterPool.set(key, transporter);
  return transporter;
}

/**
 * Generate a new Ethereal Email test account on-the-fly
 */
export async function createEtherealAccount(): Promise<{
  user: string;
  pass: string;
  smtp: { host: string; port: number; secure: boolean };
  web: string;
}> {
  try {
    const testAccount = await nodemailer.createTestAccount();
    logger.info(`Generated new Ethereal test account: ${testAccount.user}`);
    return {
      user: testAccount.user,
      pass: testAccount.pass,
      smtp: testAccount.smtp,
      web: testAccount.web
    };
  } catch (err: any) {
    logger.error('Failed to create Ethereal test account:', err);
    throw err;
  }
}

/**
 * Verify SMTP transporter connection
 */
export async function verifySmtpConnection(config: SmtpConfig): Promise<boolean> {
  const transporter = createTransporter(config);
  try {
    await transporter.verify();
    return true;
  } catch (err: any) {
    logger.error(`SMTP connection verification failed for ${config.user}@${config.host}:`, err.message);
    throw err;
  }
}

/**
 * Send an email through configured SMTP sender
 */
export async function sendEmailThroughSmtp(
  smtpConfig: SmtpConfig,
  payload: SendEmailPayload
): Promise<SendEmailResult> {
  try {
    const transporter = createTransporter(smtpConfig);
    const deterministicMessageId = generateDeterministicMessageId(payload.emailId);

    const isHtml = /<[a-z][\s\S]*>/i.test(payload.body);

    const info = await transporter.sendMail({
      from: `"${payload.fromName}" <${payload.fromEmail}>`,
      to: payload.to,
      subject: payload.subject,
      text: isHtml ? payload.body.replace(/<[^>]+>/g, '') : payload.body,
      html: isHtml ? payload.body : `<div style="font-family: sans-serif; white-space: pre-wrap;">${payload.body}</div>`,
      messageId: deterministicMessageId,
      headers: {
        'X-ReachInbox-Email-ID': payload.emailId
      }
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
    const finalMessageId = info.messageId || deterministicMessageId;

    logger.info(`SMTP send successful for email ${payload.emailId} to ${payload.to}. MessageId: ${finalMessageId}`);
    if (previewUrl) {
      logger.info(`Ethereal preview URL: ${previewUrl}`);
    }

    return {
      success: true,
      messageId: finalMessageId,
      previewUrl: previewUrl || undefined
    };
  } catch (err: any) {
    logger.error(`SMTP send failed for email ${payload.emailId} to ${payload.to}:`, err.message);
    return {
      success: false,
      errorMessage: err.message || 'SMTP delivery failure'
    };
  }
}

