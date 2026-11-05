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
    // Verify connection first
    const config: SmtpConfig = {
      host: input.smtpHost,
      port: input.smtpPort,
      user: input.smtpUser,
      pass: input.smtpPassword
    };

    await verifySmtpConnection(config);

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

    const isConnected = await verifySmtpConnection(config);
    return { success: isConnected, message: 'SMTP connection verified successfully' };
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

