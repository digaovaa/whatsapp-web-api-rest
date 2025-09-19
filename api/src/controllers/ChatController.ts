import { Request, Response } from 'express';
import { sessionManager } from '../core/sessions/SessionManager';
import { whatsAppService } from '../services/WhatsAppService';
import logger from '../utils/logger';
import { messagesRepository } from '../core/repositories/MessagesRepository';

function getDefaultSessionId(): string | null {
    const sessions = sessionManager.getAllSessions();
    if (!sessions || sessions.length === 0) return null;
    return sessions[0].info.id;
}

export class ChatController {
    public async sendText(req: Request, res: Response): Promise<void> {
        try {
            const { Phone, Body } = req.body || {};
            const sessionId = getDefaultSessionId();
            if (!sessionId) {
                res.status(404).json({ success: false, message: 'Nenhuma sessão ativa' });
                return;
            }
            if (!Phone || !Body) {
                res.status(400).json({ success: false, message: 'Campos obrigatórios: Phone, Body' });
                return;
            }

      const result = await whatsAppService.sendTextMessage(sessionId, Phone, Body);
      try {
        const messageID = result?.key?.id as string | undefined;
        const payload = result?.message;
        const key = result?.key;
        if (messageID && payload) {
          await messagesRepository.insert(messageID, JSON.stringify(payload), sessionId, JSON.stringify(key));
        }
      } catch (e) {
        logger.warn({ e }, 'Falha ao registrar mensagem enviada (text)');
      }
            res.json({ success: true, data: result });
        } catch (error) {
            logger.error({ error }, 'sendText failed');
            res.status(500).json({ success: false, message: (error as Error).message });
        }
    }

    public async sendImage(req: Request, res: Response): Promise<void> {
        await this.sendMediaGeneric(req, res, 'image');
    }

    public async sendAudio(req: Request, res: Response): Promise<void> {
        await this.sendMediaGeneric(req, res, 'audio');
    }

    public async sendDocument(req: Request, res: Response): Promise<void> {
        await this.sendMediaGeneric(req, res, 'document');
    }

    public async sendVideo(req: Request, res: Response): Promise<void> {
        await this.sendMediaGeneric(req, res, 'video');
    }

    private async sendMediaGeneric(req: Request, res: Response, type: 'image' | 'video' | 'document' | 'audio'): Promise<void> {
        try {
            const { Phone, FileURL, Caption, FileName } = req.body || {};
            const sessionId = getDefaultSessionId();
            if (!sessionId) {
                res.status(404).json({ success: false, message: 'Nenhuma sessão ativa' });
                return;
            }
            if (!Phone || !FileURL) {
                res.status(400).json({ success: false, message: 'Campos obrigatórios: Phone, FileURL' });
                return;
            }

      const result = await whatsAppService.sendMediaMessage(sessionId, Phone, {
                type,
                url: FileURL,
                caption: Caption,
                filename: FileName
            } as any);
      try {
        const messageID = result ?.key?.id as string | undefined;
        const payload = result?.message;
        const key = result?.key;
        if (messageID && payload) {
          await messagesRepository.insert(messageID, JSON.stringify(payload), sessionId, JSON.stringify(key));
        }
      } catch (e) {
        logger.warn({ e }, 'Falha ao registrar mensagem enviada (media)');
      }
            res.json({ success: true, data: result });
        } catch (error) {
            logger.error({ error, type }, 'sendMedia failed');
            res.status(500).json({ success: false, message: (error as Error).message });
        }
    }

    public async sendContact(req: Request, res: Response): Promise<void> {
        try {
            const { Phone, VCard } = req.body || {};
            const sessionId = getDefaultSessionId();
            if (!sessionId) {
                res.status(404).json({ success: false, message: 'Nenhuma sessão ativa' });
                return;
            }
            if (!Phone || !VCard?.ContactName || !VCard?.ContactPhone) {
                res.status(400).json({ success: false, message: 'Campos obrigatórios: Phone, VCard.ContactName, VCard.ContactPhone' });
                return;
            }
      const result = await whatsAppService.sendContactMessage(sessionId, Phone, {
                fullName: VCard.ContactName,
                phoneNumber: VCard.ContactPhone
            });
      try {
        const messageID = result ?.key?.id as string | undefined;
        const payload = result?.message;
        const key = result?.key;
        if (messageID && payload && key) {
          await messagesRepository.insert(messageID, JSON.stringify(payload), sessionId, JSON.stringify(key));
        }
      } catch (e) {
        logger.warn({ e }, 'Falha ao registrar mensagem enviada (contact)');
      }
            res.json({ success: true, data: result });
        } catch (error) {
            logger.error({ error }, 'sendContact failed');
            res.status(500).json({ success: false, message: (error as Error).message });
        }
    }

    public async sendButtons(req: Request, res: Response): Promise<void> {
        try {
            const { Phone, Id, Title, Buttons } = req.body || {};
            const sessionId = getDefaultSessionId();
            if (!sessionId) {
                res.status(404).json({ success: false, message: 'Nenhuma sessão ativa' });
                return;
            }
            if (!Phone || !Title || !Array.isArray(Buttons)) {
                res.status(400).json({ success: false, message: 'Campos obrigatórios: Phone, Title, Buttons[]' });
                return;
            }
      const result = await whatsAppService.sendTemplateMessage(sessionId, Phone, {
                text: Title,
                buttons: Buttons.map((b: any) => ({ id: b.ButtonId ?? b.Id ?? Id ?? '1', text: b.ButtonText }))
            });
      try {
        const messageID = result ?.key?.id as string | undefined;
        const payload = result?.message;
        const key = result?.key;
        if (messageID && payload && key) {
          await messagesRepository.insert(messageID, JSON.stringify(payload), sessionId, JSON.stringify(key));
        }
      } catch (e) {
        logger.warn({ e }, 'Falha ao registrar mensagem enviada (buttons)');
      }
            res.json({ success: true, data: result });
        } catch (error) {
            logger.error({ error }, 'sendButtons failed');
            res.status(500).json({ success: false, message: (error as Error).message });
        }
    }
    public async editMessage(req: Request, res: Response): Promise<void> {
        try {
            const { Phone, Body, Id } = req.body || {};
            const sessionId = getDefaultSessionId();
            if (!sessionId) {
                res.status(404).json({ success: false, message: 'Nenhuma sessão ativa' });
                return;
            }

            if (!Phone || !Body || !Id) {
                res.status(400).json({ success: false, message: 'Campos obrigatórios: Phone, Body, Id' });
                return;
            }
            
            const result = await whatsAppService.editMessage(sessionId, Phone, Body, Id);
            res.json({ success: true, data: result });
        } catch (error) {
            logger.error({ error }, 'editMessage failed');
            res.status(500).json({ success: false, message: (error as Error).message });
        }
    }

    // Stubs 501 para endpoints ainda não implementados
    public notImplemented(_req: Request, res: Response): void {
        res.status(501).json({ success: false, message: 'Não implementado' });
    }
}

export const chatController = new ChatController();


