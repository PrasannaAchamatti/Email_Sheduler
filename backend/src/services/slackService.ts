import { prisma } from '../config/database';
import { encrypt, decrypt } from '../utils/encryption';
import {
  getSlackAuthorizeUrl,
  exchangeSlackCode,
  sendSlackRateLimitAlert
} from '../integrations/slack/slackClient';
import { logger } from '../config/logger';

export class SlackService {
  /**
   * Generate Slack OAuth URL with state
   */
  public static getConnectUrl(userId: string): string {
    const state = Buffer.from(JSON.stringify({ userId, ts: Date.now() })).toString('base64');
    return getSlackAuthorizeUrl(state);
  }

  /**
   * Handle OAuth callback from Slack
   */
  public static async handleOAuthCallback(code: string, state: string) {
    let userId: string;
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
      userId = decoded.userId;
    } catch (e) {
      throw new Error('Invalid OAuth state parameter');
    }

    const oauthResult = await exchangeSlackCode(code);
    const encryptedToken = encrypt(oauthResult.accessToken);

    const integration = await prisma.slackIntegration.upsert({
      where: { userId },
      create: {
        userId,
        teamId: oauthResult.teamId,
        teamName: oauthResult.teamName,
        channelId: oauthResult.incomingWebhook?.channelId || null,
        channelName: oauthResult.incomingWebhook?.channel || null,
        accessTokenEncrypted: encryptedToken,
        botUserId: oauthResult.botUserId || null,
        connected: true
      },
      update: {
        teamId: oauthResult.teamId,
        teamName: oauthResult.teamName,
        channelId: oauthResult.incomingWebhook?.channelId || null,
        channelName: oauthResult.incomingWebhook?.channel || null,
        accessTokenEncrypted: encryptedToken,
        botUserId: oauthResult.botUserId || null,
        connected: true
      }
    });

    logger.info(`Slack connected successfully for user ${userId} (Team: ${oauthResult.teamName})`);
    return integration;
  }

  /**
   * Get Slack connection status for a user
   */
  public static async getConnectionStatus(userId: string) {
    const integration = await prisma.slackIntegration.findUnique({
      where: { userId }
    });

    if (!integration || !integration.connected) {
      return {
        connected: false,
        teamName: null,
        channelName: null
      };
    }

    return {
      connected: true,
      teamId: integration.teamId,
      teamName: integration.teamName,
      channelId: integration.channelId,
      channelName: integration.channelName,
      connectedAt: integration.updatedAt
    };
  }

  /**
   * Disconnect Slack
   */
  public static async disconnectSlack(userId: string) {
    await prisma.slackIntegration.updateMany({
      where: { userId },
      data: { connected: false }
    });
    logger.info(`Slack disconnected for user ${userId}`);
    return { success: true };
  }

  /**
   * Trigger a test rate limit notification to Slack to verify end-to-end integration
   */
  public static async sendTestNotification(userId: string) {
    const integration = await prisma.slackIntegration.findUnique({
      where: { userId }
    });

    if (!integration || !integration.connected || !integration.accessTokenEncrypted) {
      throw new Error('Slack is not connected. Please connect Slack first.');
    }

    const decryptedToken = decrypt(integration.accessTokenEncrypted);
    const resumeTime = new Date(Date.now() + 3600 * 1000);

    const success = await sendSlackRateLimitAlert(decryptedToken, integration.channelId || undefined, {
      senderEmail: 'test-sender@reachinbox.test',
      hourlyLimit: 200,
      currentCount: 201,
      hourWindow: new Date().toISOString().slice(0, 13),
      campaignSubject: 'Test Campaign Rate Limit Alert',
      resumeTime
    });

    if (!success) {
      throw new Error('Failed to deliver message to Slack. Check token permissions and channels.');
    }

    return { success: true, message: 'Test alert sent successfully to Slack' };
  }
}

