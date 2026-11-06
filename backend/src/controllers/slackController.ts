import { Request, Response, NextFunction } from 'express';
import { SlackService } from '../services/slackService';
import { env } from '../config/env';

function resolveRedirectUri(req: Request): string {
  if (env.SLACK_REDIRECT_URI && !env.SLACK_REDIRECT_URI.includes('localhost:5000')) {
    return env.SLACK_REDIRECT_URI;
  }
  const host = req.get('x-forwarded-host') || req.get('host');
  const proto = req.get('x-forwarded-proto') || req.protocol;
  if (host) {
    return `${proto}://${host}/api/slack/callback`;
  }
  return env.SLACK_REDIRECT_URI;
}

export class SlackController {
  public static async getConnectUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const redirectUri = resolveRedirectUri(req);
      const url = SlackService.getConnectUrl(req.user!.userId, redirectUri);
      res.status(200).json({ success: true, data: { url } });
    } catch (err) {
      next(err);
    }
  }

  public static async saveWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const { webhookUrl, channelName } = req.body;
      if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.startsWith('https://hooks.slack.com/')) {
        return res.status(400).json({
          success: false,
          error: 'Please provide a valid Slack Incoming Webhook URL starting with https://hooks.slack.com/'
        });
      }

      const integration = await SlackService.saveWebhook(req.user!.userId, webhookUrl.trim(), channelName?.trim());
      res.status(200).json({
        success: true,
        data: integration,
        message: 'Slack Webhook connected and verified with real test notification!'
      });
    } catch (err) {
      next(err);
    }
  }

  public static async handleCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const { code, state, error } = req.query;

      if (error) {
        return res.redirect(`${env.FRONTEND_URL}/slack?error=${encodeURIComponent(String(error))}`);
      }

      if (!code || !state) {
        return res.redirect(`${env.FRONTEND_URL}/slack?error=missing_code_or_state`);
      }

      const redirectUri = resolveRedirectUri(req);
      await SlackService.handleOAuthCallback(code as string, state as string, redirectUri);
      res.redirect(`${env.FRONTEND_URL}/slack?success=true`);
    } catch (err: any) {
      res.redirect(`${env.FRONTEND_URL}/slack?error=${encodeURIComponent(err.message || 'OAuth failure')}`);
    }
  }

  public static async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const status = await SlackService.getConnectionStatus(req.user!.userId);
      res.status(200).json({ success: true, data: status });
    } catch (err) {
      next(err);
    }
  }

  public static async disconnect(req: Request, res: Response, next: NextFunction) {
    try {
      await SlackService.disconnectSlack(req.user!.userId);
      res.status(200).json({ success: true, message: 'Slack disconnected' });
    } catch (err) {
      next(err);
    }
  }

  public static async sendTestAlert(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SlackService.sendTestNotification(req.user!.userId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}
