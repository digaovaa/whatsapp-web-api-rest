import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth';
import { legacySessionController } from '../controllers/LegacySessionController';

const router = Router();

router.get('/session/status', isAuthenticated, legacySessionController.status.bind(legacySessionController));
router.get('/session/qr', isAuthenticated, legacySessionController.qr.bind(legacySessionController));
router.post('/session/pairphone', isAuthenticated, legacySessionController.notImplemented.bind(legacySessionController));
router.post('/session/logout', isAuthenticated, legacySessionController.notImplemented.bind(legacySessionController));
router.post('/session/disconnect', isAuthenticated, legacySessionController.notImplemented.bind(legacySessionController));
router.post('/session/reconnect', isAuthenticated, legacySessionController.notImplemented.bind(legacySessionController));
router.post('/session/connect', isAuthenticated, legacySessionController.notImplemented.bind(legacySessionController));

export default router;


