import { WebClient } from '@slack/web-api';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

export interface SlackOAuthResult {
  accessToken: string;
  teamId: string;
  teamName: string;
  botUserId?: string;
  incomingWebhook?: {
    channel: string;
    channelId: string;
    configurationUrl: string;
    url: string;
  };
}

export function getSlackAuthorizeUrl(state: string, redirectUri?: string): string {
  if (!env.SLACK_CLIENT_ID || env.SLACK_CLIENT_ID === 'your-slack-client-id') {
    throw new Error('Slack OAuth App is not configured. Please use Incoming Webhook URL instead, or set SLACK_CLIENT_ID in your environment variables.');
  }

  const scopes = ['chat:write', 'chat:write.public', 'channels:read', 'incoming-webhook'].join(',');
  const params = new URLSearchParams({
    client_id: env.SLACK_CLIENT_ID,
    scope: scopes,
    redirect_uri: redirectUri || env.SLACK_REDIRECT_URI,
    state
  });
  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

export async function exchangeSlackCode(code: string, redirectUri?: string): Promise<SlackOAuthResult> {
  const client = new WebClient();
  try {
    const response: any = await client.oauth.v2.access({
      client_id: env.SLACK_CLIENT_ID,
      client_secret: env.SLACK_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri || env.SLACK_REDIRECT_URI
    });

    if (!response.ok) {
      throw new Error(`Slack OAuth failed: ${response.error || 'Unknown error'}`);
    }

    return {
      accessToken: response.access_token,
      teamId: response.team.id,
      teamName: response.team.name,
      botUserId: response.bot_user_id,
      incomingWebhook: response.incoming_webhook
    };
  } catch (err: any) {
    logger.error('Slack OAuth token exchange failed:', err);
    throw err;
  }
}

export interface SlackRateLimitAlertData {
  senderEmail: string;
  hourlyLimit: number;
  currentCount: number;
  hourWindow: string;
  campaignSubject?: string;
  campaignId?: string;
  resumeTime: Date;
}

export function buildSlackAlertBlocks(data: SlackRateLimitAlertData, resumeFormatted: string) {
  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '⚠️ ReachInbox Hourly Rate Limit Reached',
        emoji: true
      }
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Sender:*\n\`${data.senderEmail}\``
        },
        {
          type: 'mrkdwn',
          text: `*Configured Limit:*\n${data.hourlyLimit} emails/hour`
        },
        {
          type: 'mrkdwn',
          text: `*Current Hour Window:*\n\`${data.hourWindow}\``
        },
        {
          type: 'mrkdwn',
          text: `*Resuming At:*\n${resumeFormatted}`
        }
      ]
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: data.campaignSubject
          ? `*Campaign Subject:* "${data.campaignSubject}"\n*Status:* Remaining jobs automatically delayed to next hour window.`
          : `*Status:* Excess jobs have been safely paused and rescheduled to the next hourly window without dropping or failing any recipient.`
      }
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `ReachInbox Distributed Rate Limiting Engine • ${new Date().toISOString()}`
        }
      ]
    }
  ];
}

/**
 * Send alert directly via Slack Incoming Webhook
 */
export async function sendSlackWebhookMessage(
  webhookUrl: string,
  data: SlackRateLimitAlertData
): Promise<boolean> {
  try {
    const resumeFormatted = data.resumeTime.toLocaleString('en-US', {
      timeZone: 'UTC',
      dateStyle: 'medium',
      timeStyle: 'medium'
    }) + ' UTC';

    const blocks = buildSlackAlertBlocks(data, resumeFormatted);

    const payload = {
      text: `⚠️ Rate limit reached for sender ${data.senderEmail}: ${data.currentCount}/${data.hourlyLimit} emails. Resuming at ${resumeFormatted}.`,
      blocks
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      logger.error(`Slack webhook error HTTP ${res.status}: ${errText}`);
      return false;
    }

    logger.info(`Slack rate limit alert successfully posted to incoming webhook for ${data.senderEmail}`);
    return true;
  } catch (err: any) {
    logger.error('Failed to dispatch Slack webhook message:', err.message);
    return false;
  }
}

/**
 * Dispatch Slack rate limit alert via WebClient OAuth token or Webhook
 */
export async function sendSlackRateLimitAlert(
  auth: { accessToken?: string; webhookUrl?: string } | string,
  targetChannel: string | undefined,
  data: SlackRateLimitAlertData
): Promise<boolean> {
  const token = typeof auth === 'string' ? auth : auth.accessToken;
  const webhook = typeof auth === 'object' ? auth.webhookUrl : (auth.startsWith('https://') ? auth : undefined);

  if (webhook) {
    const ok = await sendSlackWebhookMessage(webhook, data);
    if (ok) return true;
  }

  if (!token || token.startsWith('https://')) {
    return false;
  }

  try {
    const client = new WebClient(token);
    const resumeFormatted = data.resumeTime.toLocaleString('en-US', {
      timeZone: 'UTC',
      dateStyle: 'medium',
      timeStyle: 'medium'
    }) + ' UTC';

    const blocks = buildSlackAlertBlocks(data, resumeFormatted);

    let channel = targetChannel;
    if (!channel) {
      try {
        const convList = await client.conversations.list({ types: 'public_channel', limit: 5 });
        if (convList.channels && convList.channels.length > 0) {
          channel = convList.channels[0].id;
        }
      } catch (e) {
        channel = 'general';
      }
    }

    if (!channel) {
      channel = 'general';
    }

    await client.chat.postMessage({
      channel,
      text: `⚠️ Rate limit reached for sender ${data.senderEmail}: ${data.currentCount}/${data.hourlyLimit} emails. Resuming at ${resumeFormatted}.`,
      blocks
    });

    logger.info(`Slack rate limit notification successfully delivered to channel ${channel} for ${data.senderEmail}`);
    return true;
  } catch (err: any) {
    logger.error('Failed to send Slack rate limit alert:', err.message);
    return false;
  }
}
