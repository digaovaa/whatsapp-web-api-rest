import { Request, Response, NextFunction } from 'express';
import { SECRET_KEY } from '../config/env';

const secretPaths = ['/count/connect', '/company/create', '/company/delete'];

export const authInstance = (req: Request, res: Response, next: NextFunction): void => {
  // Só exige SECRET_KEY nos caminhos sensíveis
  if (secretPaths.some(p => req.path.includes(p))) {
    const secret = (req.headers['secret_key'] as string) || '';
    if (!secret || secret !== SECRET_KEY) {
      res.status(401).json({ success: false, message: 'unauthorized' });
      return;
    }
  }
  next();
};


