import { Router } from 'express';
import { SenderController } from '../controllers/senderController';
import { requireAuth } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/requestValidator';
import { createSenderSchema } from '../validators/senderValidators';

const router = Router();

router.use(requireAuth);

router.get('/', SenderController.getSenders);
router.post('/', validateRequest({ body: createSenderSchema }), SenderController.createSender);
router.post('/ethereal', SenderController.createEtherealSender);
router.post('/:id/test', SenderController.testConnection);
router.delete('/:id', SenderController.deleteSender);

export default router;

