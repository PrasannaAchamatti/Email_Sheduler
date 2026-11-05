import { Router } from 'express';
import multer from 'multer';
import { EmailController } from '../controllers/emailController';
import { requireAuth } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/requestValidator';
import { scheduleEmailSchema } from '../validators/emailValidators';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

const router = Router();

router.use(requireAuth);

router.post('/schedule', validateRequest({ body: scheduleEmailSchema }), EmailController.scheduleCampaign);
router.post('/upload-recipients', upload.single('file'), EmailController.uploadRecipients);
router.get('/scheduled', EmailController.getScheduledEmails);
router.get('/sent', EmailController.getSentEmails);
router.get('/search', EmailController.searchEmails);
router.get('/:id', EmailController.getEmailById);
router.post('/:id/cancel', EmailController.cancelEmail);

export default router;

