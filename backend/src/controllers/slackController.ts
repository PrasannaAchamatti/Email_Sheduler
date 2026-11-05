import { Request, Response, NextFunction } from 'express';
import { SlackService } from '../services/slackService';
import { env } from '../config/env';

export class SlackController {
  public static async getConnectUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const url = SlackService.getConnectUrl(req.user!.userId);
      res.status(200).json({ success: true, data: { url } });
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

      await SlackService.handleOAuthCallback(code as string, state as string);
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

