import { Request, Response } from 'express';
import { sessionManager } from '../core/sessions/SessionManager';

export class LegacySessionController {
  public status(_req: Request, res: Response): void {
    const sessions = sessionManager.getAllSessions().map((s) => s.info);
    res.json({ success: true, data: sessions });
  }

  public qr(_req: Request, res: Response): void {
    const sessions = sessionManager.getAllSessions();
    const withQR = sessions.find((s) => s.info.qr);
    if (!withQR) {
      res.status(404).json({ success: false, message: 'QR não disponível' });
      return;
    }
    res.json({ success: true, data: { sessionId: withQR.info.id, qrCode: withQR.info.qr } });
  }

  public notImplemented(_req: Request, res: Response): void {
    res.status(501).json({ success: false, message: 'Não implementado' });
  }
}

export const legacySessionController = new LegacySessionController();


