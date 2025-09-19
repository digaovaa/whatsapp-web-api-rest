import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth';
import { groupController } from '../controllers/GroupController';

const router = Router();

router.get('/group/list', isAuthenticated, groupController.notImplemented.bind(groupController));
router.get('/group/info', isAuthenticated, groupController.notImplemented.bind(groupController));
router.get('/group/invitelink', isAuthenticated, groupController.notImplemented.bind(groupController));
router.post('/group/create', isAuthenticated, groupController.notImplemented.bind(groupController));

export default router;


