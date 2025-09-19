import { Request, Response } from 'express';

export class GroupController {
  public notImplemented(_req: Request, res: Response): void {
    res.status(501).json({ success: false, message: 'Não implementado' });
  }
}

export const groupController = new GroupController();


