import { Request, Response, NextFunction } from 'express';
import { companyRepository } from '../core/repositories/CompanyRepository';
import  logger  from '../utils/logger';

export const authCompany = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const token = (req.headers['token_company'] as string) || '';
  if (!token) {
    res.status(401).json({ success: false, message: 'unauthorized: token_company header required' });
    return;
  }
  const company = await companyRepository.getByToken(token);
  logger.info({ company }, 'Company found');
  if (!company) {
    res.status(401).json({ success: false, message: 'unauthorized' });
    return;
  }
  (req as any).company = { id: company.id, name: company.name };
  next();
};


