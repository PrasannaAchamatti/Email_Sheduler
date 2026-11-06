import { prisma } from '../config/database';
import { encrypt, decrypt } from '../utils/encryption';
import {
  getSlackAuthorizeUrl,
  exchangeSlackCode,
  sendSlackRateLimitAlert,
  sendSlackWebhookMessage
} from '../integrations/slack/slackClient';
import { logger } from '../config/logger';

export class SlackService {
  /**
   * Generate Slack OAuth URL with state
   */
  public static getConnectUrl(userId: string, redirectUri?: string): string {
    const state = Buffer.from(JSON.stringify({ userId, ts: Date.now() })).toString('base64');
    return getSlackAuthorizeUrl(state, redirectUri);
  }

  /**
   * Save an instant Slack incoming webhook URL
   */
  public static async saveWebhook(userId: string, webhookUrl: string, channelName?: string) {
    const resumeTime = new Date(Date.now() + 3600 * 1000);
    const testSuccess = await sendSlackWebhookMessage(webhookUrl, {
      senderEmail: 'setup-verification@reachinbox.test',
      hourlyLimit: 200,
      currentCount: 201,
      hourWindow: new Date().toISOString().slice(0, 13),
      campaignSubject: 'ReachInbox Slack Webhook Connection Test',
      resumeTime
    });

    if (!testSuccess) {
      throw new Error('Could not deliver test notification to this Slack webhook. Please verify the URL and try again.');
    }

    const integration = await prisma.slackIntegration.upsert({
      where: { userId },
      create: {
        userId,
        teamId: 'webhook-team',
        teamName: 'Slack Workspace',
        channelName: channelName || '#general',
        webhookUrl,
        connected: true
      },
      update: {
        channelName: channelName || '#general',
        webhookUrl,
        connected: true
      }
    });

    logger.info(`Slack Webhook saved and verified for user ${userId}`);
    return integration;
  }

  /**
   * Handle OAuth callback from Slack
   */
  public static async handleOAuthCallback(code: string, state: string, redirectUri?: string) {
    let userId: string;
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
      userId = decoded.userId;
    } catch (e) {
      throw new Error('Invalid OAuth state parameter');
    }

    const oauthResult = await exchangeSlackCode(code, redirectUri);
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
        type: null,
        teamName: null,
        channelName: null,
        webhookUrl: null
      };
    }

    const type = integration.webhookUrl ? 'webhook' : 'oauth';

    return {
      connected: true,
      type,
      teamId: integration.teamId,
      teamName: integration.teamName,
      channelId: integration.channelId,
      channelName: integration.channelName,
      webhookUrl: integration.webhookUrl ? integration.webhookUrl.replace(/^(.{25}).*(.{10})$/, '$1...$2') : null,
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

    if (!integration || !integration.connected) {
      throw new Error('Slack is not connected. Please connect Slack first.');
    }

    const resumeTime = new Date(Date.now() + 3600 * 1000);
    const testData = {
      senderEmail: 'test-sender@reachinbox.test',
      hourlyLimit: 200,
      currentCount: 201,
      hourWindow: new Date().toISOString().slice(0, 13),
      campaignSubject: 'Test Campaign Rate Limit Alert',
      resumeTime
    };

    let success = false;
    if (integration.webhookUrl) {
      success = await sendSlackWebhookMessage(integration.webhookUrl, testData);
    } else if (integration.accessTokenEncrypted) {
      const decryptedToken = decrypt(integration.accessTokenEncrypted);
      success = await sendSlackRateLimitAlert(decryptedToken, integration.channelId || undefined, testData);
    }

    if (!success) {
      throw new Error('Failed to deliver message to Slack. Check your webhook URL or bot channel permissions.');
    }

    return { success: true, message: 'Test alert sent successfully to Slack' };
  }
}
