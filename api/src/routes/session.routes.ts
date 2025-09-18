import { Router } from 'express';
import { sessionController } from '../controllers/SessionController';
import { isAuthenticated } from '../middleware/auth';
import { isAdmin } from '../middleware/admin';

const router = Router();

router.post(
  '/sessions',
  isAuthenticated,
  sessionController.createSession
);

router.get(
  '/sessions/:sessionId',
  isAuthenticated,
  sessionController.getSession
);

router.get(
  '/sessions/:sessionId/qr',
  isAuthenticated,
  sessionController.getSessionQR
);

router.delete(
  '/sessions/:sessionId',
  isAuthenticated,
  sessionController.stopSession
);

router.get(
  '/users/:userId/sessions',
  isAuthenticated,
  sessionController.listUserSessions
);

router.get(
  '/admin/sessions',
  isAuthenticated,
  isAdmin,
  sessionController.listAllSessions
);

export default router;
