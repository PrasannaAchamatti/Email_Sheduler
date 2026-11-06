import { Router } from 'express';
import { SlackController } from '../controllers/slackController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// Callback is public for Slack OAuth redirect
router.get('/callback', SlackController.handleCallback);

// Protected endpoints
router.get('/connect', requireAuth, SlackController.getConnectUrl);
router.post('/webhook', requireAuth, SlackController.saveWebhook);
router.get('/status', requireAuth, SlackController.getStatus);
router.post('/disconnect', requireAuth, SlackController.disconnect);
router.post('/test-alert', requireAuth, SlackController.sendTestAlert);

export default router;
