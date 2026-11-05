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

export function getSlackAuthorizeUrl(state: string): string {
  const scopes = ['chat:write', 'chat:write.public', 'channels:read', 'incoming-webhook'].join(',');
  const params = new URLSearchParams({
    client_id: env.SLACK_CLIENT_ID || '',
    scope: scopes,
    redirect_uri: env.SLACK_REDIRECT_URI,
    state
  });
  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

export async function exchangeSlackCode(code: string): Promise<SlackOAuthResult> {
  const client = new WebClient();
  try {
    const response: any = await client.oauth.v2.access({
      client_id: env.SLACK_CLIENT_ID,
      client_secret: env.SLACK_CLIENT_SECRET,
      code,
      redirect_uri: env.SLACK_REDIRECT_URI
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

export async function sendSlackRateLimitAlert(
  accessToken: string,
  targetChannel: string | undefined,
  data: SlackRateLimitAlertData
): Promise<boolean> {
  try {
    const client = new WebClient(accessToken);
    const resumeFormatted = data.resumeTime.toLocaleString('en-US', {
      timeZone: 'UTC',
      dateStyle: 'medium',
      timeStyle: 'medium'
    }) + ' UTC';

    const blocks = [
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

    // Determine target channel (use configured channel or find public general/random or bot channel)
    let channel = targetChannel;
    if (!channel) {
      try {
        const convList = await client.conversations.list({ types: 'public_channel', limit: 5 });
        if (convList.channels && convList.channels.length > 0) {
          channel = convList.channels[0].id;
        }
      } catch (e) {
        // Fallback channel
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

