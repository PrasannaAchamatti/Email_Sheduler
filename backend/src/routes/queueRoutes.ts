import { Router } from 'express';
import { QueueController } from '../controllers/queueController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

router.use(requireAuth);

router.get('/stats', QueueController.getStats);
router.post('/pause', QueueController.pauseQueue);
router.post('/resume', QueueController.resumeQueue);

export default router;

