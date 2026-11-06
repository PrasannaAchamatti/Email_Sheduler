import { prisma } from '../config/database';
import { encrypt, decrypt } from '../utils/encryption';
import {
  createEtherealAccount,
  verifySmtpConnection,
  SmtpConfig
} from '../integrations/smtp/smtpTransporter';
import { logger } from '../config/logger';

export interface CreateSenderInput {
  name: string;
  email: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  skipVerification?: boolean;
}

export class SenderService {
  /**
   * List all senders for a user
   */
  public static async getSendersByUser(userId: string) {
    const senders = await prisma.sender.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    // Return without raw password
    return senders.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      smtpHost: s.smtpHost,
      smtpPort: s.smtpPort,
      smtpUser: s.smtpUser,
      isEthereal: s.isEthereal,
      isActive: s.isActive,
      createdAt: s.createdAt
    }));
  }

  /**
   * Create a new custom SMTP sender
   */
  public static async createSender(userId: string, input: CreateSenderInput) {
    if (!input.skipVerification) {
      const config: SmtpConfig = {
        host: input.smtpHost,
        port: input.smtpPort,
        user: input.smtpUser,
        pass: input.smtpPassword
      };

      try {
        await verifySmtpConnection(config);
      } catch (err: any) {
        const msg = err.message || '';
        if (
          input.smtpHost.includes('gmail.com') &&
          (msg.includes('535') || msg.includes('Username and Password not accepted') || msg.includes('BadCredentials'))
        ) {
          throw new Error(
            'Gmail rejected credentials (535). Gmail requires a 16-character App Password (generate at https://myaccount.google.com/apppasswords), not your normal Google password.'
          );
        }
        if (msg.includes('ETIMEDOUT') || msg.includes('ECONNREFUSED')) {
          throw new Error(
            `Unable to connect to SMTP server at ${input.smtpHost}:${input.smtpPort}. Please verify host and port, or check "Skip connection test" to save anyway.`
          );
        }
        throw new Error(`SMTP Verification failed: ${msg}`);
      }
    }

    const encryptedPass = encrypt(input.smtpPassword);

    const sender = await prisma.sender.create({
      data: {
        userId,
        name: input.name,
        email: input.email.toLowerCase(),
        smtpHost: input.smtpHost,
        smtpPort: input.smtpPort,
        smtpUser: input.smtpUser,
        smtpPasswordEncrypted: encryptedPass,
        isEthereal: input.smtpHost.includes('ethereal.email')
      }
    });

    logger.info(`Created sender ${sender.email} for user ${userId}`);

    return {
      id: sender.id,
      name: sender.name,
      email: sender.email,
      smtpHost: sender.smtpHost,
      smtpPort: sender.smtpPort,
      isEthereal: sender.isEthereal,
      isActive: sender.isActive
    };
  }

  /**
   * Auto-generate a live Ethereal test account and register it as a sender
   */
  public static async createEtherealSender(userId: string, senderName = 'ReachInbox Test Sender') {
    const ethereal = await createEtherealAccount();
    const encryptedPass = encrypt(ethereal.pass);

    const sender = await prisma.sender.create({
      data: {
        userId,
        name: senderName,
        email: ethereal.user.toLowerCase(),
        smtpHost: ethereal.smtp.host,
        smtpPort: ethereal.smtp.port,
        smtpUser: ethereal.user,
        smtpPasswordEncrypted: encryptedPass,
        isEthereal: true
      }
    });

    logger.info(`Created dynamic Ethereal sender: ${sender.email} for user ${userId}`);

    return {
      id: sender.id,
      name: sender.name,
      email: sender.email,
      smtpHost: sender.smtpHost,
      smtpPort: sender.smtpPort,
      isEthereal: true,
      webUrl: ethereal.web
    };
  }

  /**
   * Test an existing sender's SMTP connection
   */
  public static async testSenderConnection(senderId: string, userId: string) {
    const sender = await prisma.sender.findFirst({
      where: { id: senderId, userId }
    });

    if (!sender) {
      throw new Error('Sender not found or unauthorized');
    }

    const decryptedPass = decrypt(sender.smtpPasswordEncrypted);
    const config: SmtpConfig = {
      host: sender.smtpHost,
      port: sender.smtpPort,
      user: sender.smtpUser,
      pass: decryptedPass
    };

    try {
      const isConnected = await verifySmtpConnection(config);
      return { success: isConnected, message: 'SMTP connection verified successfully' };
    } catch (err: any) {
      const msg = err.message || '';
      if (
        sender.smtpHost.includes('gmail.com') &&
        (msg.includes('535') || msg.includes('Username and Password not accepted') || msg.includes('BadCredentials'))
      ) {
        throw new Error(
          'Gmail rejected credentials (535). Please ensure 2-Step Verification is enabled and use a 16-character Google App Password.'
        );
      }
      throw new Error(`SMTP connection test failed: ${msg}`);
    }
  }

  /**
   * Delete sender
   */
  public static async deleteSender(senderId: string, userId: string) {
    const sender = await prisma.sender.findFirst({
      where: { id: senderId, userId }
    });

    if (!sender) {
      throw new Error('Sender not found or unauthorized');
    }

    await prisma.sender.delete({ where: { id: senderId } });
    return { success: true };
  }
}
