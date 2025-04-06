import {Router} from 'express';
import {messageController} from '../controllers/MessageController';
import {isAuthenticated} from '../middleware/auth';

const router = Router();

// Configure multer for file uploads (in-memory storage)
// const upload = multer({
//   storage: multer.memoryStorage(),
//   limits: {
//     fileSize: 10 * 1024 * 1024, // 10MB size limit
//   }
// });

/**
 * Message sending routes
 */

// Send a text message
router.post(
  '/sessions/:sessionId/messages/text',
  isAuthenticated,
  messageController.sendText.bind(messageController)
);

// Send a media message with file upload
router.post(
  '/sessions/:sessionId/messages/media',
  isAuthenticated,
  messageController.sendMedia.bind(messageController)
);

export default router;
