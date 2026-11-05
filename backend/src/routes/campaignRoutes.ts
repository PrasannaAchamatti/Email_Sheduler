import { Router } from 'express';
import { CampaignController } from '../controllers/campaignController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

router.use(requireAuth);

router.get('/', CampaignController.getCampaigns);
router.get('/:id', CampaignController.getCampaignById);

export default router;

