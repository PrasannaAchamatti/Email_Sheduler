import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { requireAuth } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/requestValidator';
import { googleAuthSchema, demoAuthSchema } from '../validators/authValidators';

const router = Router();

router.get('/google/status', AuthController.getGoogleAuthStatus);
router.get('/google/callback', AuthController.handleGoogleCallback);
router.post('/google', validateRequest({ body: googleAuthSchema }), AuthController.loginGoogle);
router.post('/demo', validateRequest({ body: demoAuthSchema }), AuthController.loginDemo);
router.get('/me', requireAuth, AuthController.getMe);
router.post('/logout', AuthController.logout);

export default router;

