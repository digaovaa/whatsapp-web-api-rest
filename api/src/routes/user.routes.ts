import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth';
import { userController } from '../controllers/UserController';

const router = Router();

router.get('/user/info', isAuthenticated, userController.info.bind(userController));
router.post('/user/check', isAuthenticated, userController.check.bind(userController));
router.get('/user/avatar', isAuthenticated, userController.avatar.bind(userController));
router.get('/user/contacts', isAuthenticated, userController.notImplemented.bind(userController));
router.get('/user/lid', isAuthenticated, userController.notImplemented.bind(userController));
router.get('/user/jid', isAuthenticated, userController.notImplemented.bind(userController));

export default router;


