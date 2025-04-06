import { Router } from 'express';
import { webhookController } from '../controllers/WebhookController';
import { isAuthenticated } from '../middleware/auth';

const router = Router();

/**
 * Webhook management routes
 */

// Register a webhook URL for a session
router.post(
  '/sessions/:sessionId/webhook',
  isAuthenticated,
  webhookController.registerWebhook.bind(webhookController)
);

// Get webhook configuration for a session
router.get(
  '/sessions/:sessionId/webhook',
  isAuthenticated,
  webhookController.getWebhook.bind(webhookController)
);

// Unregister a webhook for a session
router.delete(
  '/sessions/:sessionId/webhook',
  isAuthenticated,
  webhookController.unregisterWebhook.bind(webhookController)
);

export default router;
