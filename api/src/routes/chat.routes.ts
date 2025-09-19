import { Router } from 'express';
import { chatController } from '../controllers/ChatController';
import { authUser } from '../middleware/authUser';

const router = Router();

router.post('/chat/send/text', authUser, chatController.sendText.bind(chatController));
router.post('/chat/send/image', authUser, chatController.sendImage.bind(chatController));
router.post('/chat/send/audio', authUser, chatController.sendAudio.bind(chatController));
router.post('/chat/send/document', authUser, chatController.sendDocument.bind(chatController));
router.post('/chat/send/video', authUser, chatController.sendVideo.bind(chatController));
router.post('/chat/send/contact', authUser, chatController.sendContact.bind(chatController));
router.post('/chat/send/buttons', authUser, chatController.sendButtons.bind(chatController));

// Stubs para demais endpoints da coleção
router.post('/chat/react', authUser, chatController.notImplemented.bind(chatController));
router.post('/chat/presence', authUser, chatController.notImplemented.bind(chatController));
router.post('/chat/revoke', authUser, chatController.notImplemented.bind(chatController));
router.post('/chat/historysync', authUser, chatController.notImplemented.bind(chatController));
router.post('/chat/removeFromMe', authUser, chatController.notImplemented.bind(chatController));
router.post('/chat/send/call', authUser, chatController.notImplemented.bind(chatController));
router.post('/chat/edit', authUser, chatController.editMessage.bind(chatController));

export default router;


