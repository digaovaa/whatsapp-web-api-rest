import { Router } from 'express';
import sessionRoutes from './session.routes';
import messageRoutes from './message.routes';
import adminRoutes from './admin.routes';

const router = Router();

router.use('/api', sessionRoutes);
router.use('/api', messageRoutes);
router.use('/', adminRoutes);

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'whatsapp-api'
  });
});

export default router;
