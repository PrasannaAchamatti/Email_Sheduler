import { Request, Response, NextFunction } from 'express';
import { CampaignService } from '../services/campaignService';

export class CampaignController {
  public static async getCampaigns(req: Request, res: Response, next: NextFunction) {
    try {
      const campaigns = await CampaignService.getCampaignsByUser(req.user!.userId);
      res.status(200).json({ success: true, data: campaigns });
    } catch (err) {
      next(err);
    }
  }

  public static async getCampaignById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const campaign = await CampaignService.getCampaignById(id, req.user!.userId);
      res.status(200).json({ success: true, data: campaign });
    } catch (err) {
      next(err);
    }
  }
}

