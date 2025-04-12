import {Router} from 'express';
import {messageController} from '../controllers/MessageController';
import {isAuthenticated} from '../middleware/auth';

const router = Router();

router.post(
  '/sessions/:sessionId/messages/text',
  isAuthenticated,
  messageController.sendText.bind(messageController)
);


router.get(
    '/sessions/:sessionId/download-profile-photo',
    isAuthenticated,
    messageController.downloadProfilePhoto.bind(messageController)
);


router.post(
  '/sessions/:sessionId/messages/media',
  isAuthenticated,
  messageController.sendMedia.bind(messageController)
);

export default router;
