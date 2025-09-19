import { Request, Response, NextFunction } from 'express';
import { userRepository } from '../core/repositories/UserRepository';

export const authUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const token = (req.headers['token'] as string) || '';
  if (!token) {
    res.status(401).json({ success: false, message: 'unauthorized: token header required' });
    return;
  }
  const user = await userRepository.getByToken(token);
  if (!user) {
    res.status(401).json({ success: false, message: 'unauthorized' });
    return;
  }
  (req as any).user = { id: user.id, name: user.name, companyId: user.companyId };
  next();
};


