import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth';
import { webhookController } from '../controllers/WebhookController';

const router = Router();

router.get('/webhook', isAuthenticated, webhookController.get.bind(webhookController));
router.post('/webhook', isAuthenticated, webhookController.update.bind(webhookController));

export default router;


