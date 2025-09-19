import { Router } from 'express';
import { authCompany } from '../middleware/authCompany';
import { authInstance } from '../middleware/authInstance';

const router = Router();

router.post('/company/create', authInstance, (_req, res) => {
  res.status(501).json({ success: false, message: 'Não implementado' });
});

router.get('/count/connect', authInstance, (_req, res) => {
  res.status(501).json({ success: false, message: 'Não implementado' });
});

router.delete('/maintenance/remove-server', authCompany, (_req, res) => {
  res.status(501).json({ success: false, message: 'Não implementado' });
});

router.post('/maintenance/add-server', authCompany, (_req, res) => {
  res.status(501).json({ success: false, message: 'Não implementado' });
});

// Rotas de empresa (authCompany)
router.post('/company/login', authCompany, (_req, res) => {
  res.status(501).json({ success: false, message: 'Não implementado' });
});

router.post('/users/create', authCompany, (_req, res) => {
  res.status(501).json({ success: false, message: 'Não implementado' });
});

router.post('/users/update/:token', authCompany, (_req, res) => {
  res.status(501).json({ success: false, message: 'Não implementado' });
});

router.delete('/users/delete/:id', authCompany, (_req, res) => {
  res.status(501).json({ success: false, message: 'Não implementado' });
});

router.delete('/users/deletebytoken/:token', authCompany, (_req, res) => {
  res.status(501).json({ success: false, message: 'Não implementado' });
});

export default router;


