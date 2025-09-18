import { Router } from 'express';
import listEndpoints from 'express-list-endpoints';
import { isAuthenticated } from '../middleware/auth';
import { isAdmin } from '../middleware/admin';

const router = Router();

// Lista endpoints da API para o painel web consumir
router.get('/admin/endpoints', isAuthenticated, isAdmin, (req, res) => {
    const endpoints = listEndpoints(req.app);
    res.json({ success: true, data: endpoints });
});

export default router;


