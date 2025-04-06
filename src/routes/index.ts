import { Router } from 'express';
import sessionRoutes from './session.routes';
import messageRoutes from './message.routes';

const router = Router();

router.use('/api', sessionRoutes);
router.use('/api', messageRoutes);

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'whatsapp-api'
  });
});

export default router;
