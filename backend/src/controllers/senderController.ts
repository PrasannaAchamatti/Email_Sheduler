import { Request, Response, NextFunction } from 'express';
import { SenderService } from '../services/senderService';

export class SenderController {
  public static async getSenders(req: Request, res: Response, next: NextFunction) {
    try {
      const senders = await SenderService.getSendersByUser(req.user!.userId);
      res.status(200).json({ success: true, data: senders });
    } catch (err) {
      next(err);
    }
  }

  public static async createSender(req: Request, res: Response, next: NextFunction) {
    try {
      const sender = await SenderService.createSender(req.user!.userId, req.body);
      res.status(201).json({ success: true, data: sender });
    } catch (err) {
      next(err);
    }
  }

  public static async createEtherealSender(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      const sender = await SenderService.createEtherealSender(
        req.user!.userId,
        name || 'ReachInbox Ethereal Test Sender'
      );
      res.status(201).json({ success: true, data: sender });
    } catch (err) {
      next(err);
    }
  }

  public static async testConnection(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await SenderService.testSenderConnection(id, req.user!.userId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async deleteSender(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await SenderService.deleteSender(id, req.user!.userId);
      res.status(200).json({ success: true, message: 'Sender deleted' });
    } catch (err) {
      next(err);
    }
  }
}

