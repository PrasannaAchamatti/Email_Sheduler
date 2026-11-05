import { Router } from 'express';
import { RateLimitController } from '../controllers/rateLimitController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

router.use(requireAuth);

router.get('/', RateLimitController.getRateLimits);
router.get('/:senderId', RateLimitController.getSenderRateLimit);
router.post('/:senderId/reset', RateLimitController.resetRateLimit);

export default router;

