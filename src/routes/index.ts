import { Router } from 'express';
import sessionRoutes from './session.routes';
import messageRoutes from './message.routes';
import webhookRoutes from './webhook.routes';

const router = Router();

// API routes
router.use('/api', sessionRoutes);
router.use('/api', messageRoutes);
router.use('/api', webhookRoutes);

// Health check route
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'whatsapp-api'
  });
});

export default router;
