import { Router } from 'express';
import listEndpoints from 'express-list-endpoints';
import { authCompany } from '../middleware/authCompany';
import { isAdmin } from '../middleware/admin';

const router = Router();

// Lista endpoints da API para o painel web consumir
router.get('/admin/endpoints', authCompany, (req, res) => {
    const endpoints = listEndpoints(req.app);
    res.json({ success: true, data: endpoints });
});

export default router;


