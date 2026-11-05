import { Router } from 'express';
import authRoutes from './authRoutes';
import dashboardRoutes from './dashboardRoutes';
import senderRoutes from './senderRoutes';
import campaignRoutes from './campaignRoutes';
import emailRoutes from './emailRoutes';
import rateLimitRoutes from './rateLimitRoutes';
import slackRoutes from './slackRoutes';
import queueRoutes from './queueRoutes';
import healthRoutes from './healthRoutes';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/senders', senderRoutes);
apiRouter.use('/campaigns', campaignRoutes);
apiRouter.use('/emails', emailRoutes);
apiRouter.use('/rate-limits', rateLimitRoutes);
apiRouter.use('/slack', slackRoutes);
apiRouter.use('/queue', queueRoutes);
apiRouter.use('/health', healthRoutes);

export default apiRouter;

