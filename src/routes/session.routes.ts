import { Router } from 'express';
import { sessionController } from '../controllers/SessionController';
import { isAuthenticated } from '../middleware/auth';
import { isAdmin } from '../middleware/admin';

const router = Router();

/**
 * Session management routes
 */

// Create a new session
router.post(
  '/sessions',
  isAuthenticated,
  sessionController.createSession
);

// Get session information
router.get(
  '/sessions/:sessionId',
  isAuthenticated,
  sessionController.getSession
);

// Get session QR code
router.get(
  '/sessions/:sessionId/qr',
  isAuthenticated,
  sessionController.getSessionQR
);

// Stop and remove a session
router.delete(
  '/sessions/:sessionId',
  isAuthenticated,
  sessionController.stopSession
);

// Get all sessions for a user
router.get(
  '/users/:userId/sessions',
  isAuthenticated,
  sessionController.listUserSessions
);

// Admin route: Get all sessions
router.get(
  '/admin/sessions',
  isAuthenticated,
  isAdmin,
  sessionController.listAllSessions
);

export default router;
