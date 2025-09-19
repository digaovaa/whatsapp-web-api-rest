import { Request, Response } from 'express';
import { sessionManager } from '../core/sessions/SessionManager';
import { whatsAppService } from '../services/WhatsAppService';
import logger from '../utils/logger';

function getDefaultSessionId(): string | null {
  const sessions = sessionManager.getAllSessions();
  if (!sessions || sessions.length === 0) return null;
  return sessions[0].info.id;
}

export class UserController {
  public async info(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = getDefaultSessionId();
      if (!sessionId) {
        res.status(404).json({ success: false, message: 'Nenhuma sessão ativa' });
        return;
      }
      const body = req.body || {};
      const Phone: string[] = body.Phone || body.phone || [];
      if (!Array.isArray(Phone) || Phone.length === 0) {
        res.status(400).json({ success: false, message: 'Campo Phone deve ser array de strings' });
        return;
      }
      const results = await Promise.all(
        Phone.map(async (p) => {
          const exists = await whatsAppService.checkPhoneNumberExists(sessionId, p);
          return { Query: p, IsInWhatsapp: exists };
        })
      );
      res.json({ success: true, data: { Users: results } });
    } catch (error) {
      logger.error({ error }, 'user info failed');
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  }

  public async check(req: Request, res: Response): Promise<void> {
    return this.info(req, res);
  }

  public async avatar(req: Request, res: Response): Promise<void> {
    try {
      const { Phone } = req.body || req.query || {} as any;
      const sessionId = getDefaultSessionId();
      if (!sessionId) {
        res.status(404).json({ success: false, message: 'Nenhuma sessão ativa' });
        return;
      }
      if (!Phone) {
        res.status(400).json({ success: false, message: 'Campo obrigatório: Phone' });
        return;
      }
      const url = await whatsAppService.getProfilePicture(sessionId, String(Phone));
      res.json({ success: true, data: url });
    } catch (error) {
      logger.error({ error }, 'user avatar failed');
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  }

  public notImplemented(_req: Request, res: Response): void {
    res.status(501).json({ success: false, message: 'Não implementado' });
  }
}

export const userController = new UserController();


