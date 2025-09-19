import { Router } from 'express';
import sessionRoutes from './session.routes';
import messageRoutes from './message.routes';
import adminRoutes from './admin.routes';
import { authCompany } from '../middleware/authCompany';
import { authUser } from '../middleware/authUser';
import { authInstance } from '../middleware/authInstance';
import chatRoutes from './chat.routes';
import userRoutes from './user.routes';
import groupRoutes from './group.routes';
import webhookRoutes from './webhook.routes';
import legacySessionRoutes from './session-legacy.routes';
import companyRoutes from './company.routes';

const router = Router();

router.use('/api', sessionRoutes);
router.use('/api', messageRoutes);
router.use(legacySessionRoutes);
router.use(chatRoutes);
router.use(userRoutes);
router.use(groupRoutes);
router.use(webhookRoutes);
router.use(companyRoutes);
router.use(adminRoutes);

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'whatsapp-api'
  });
});

export default router;
