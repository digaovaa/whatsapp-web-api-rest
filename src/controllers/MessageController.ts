import {Request, Response} from 'express';
import {whatsAppService} from '../services/WhatsAppService';
import {sessionManager} from '../core/sessions/SessionManager';
import logger from '../utils/logger';

export class MessageController {

    public async sendText(req: Request, res: Response): Promise<void> {
        try {
            const {sessionId} = req.params;
            const {to, text} = req.body;

            if (!to || !text) {
                res.status(400).json({
                    success: false,
                    message: 'Missing required fields: to, text'
                });
                return;
            }

            const session = sessionManager.getSessionInfo(sessionId);
            if (!session) {
                res.status(404).json({
                    success: false,
                    message: 'Session not found'
                });
                return;
            }

            const result = await whatsAppService.sendTextMessage(
                sessionId,
                to,
                text
            );

            res.json({
                success: true,
                message: 'Message sent successfully',
                data: result
            });
        } catch (error) {
            logger.error({error, sessionId: req.params.sessionId}, 'Failed to send text message');
            res.status(500).json({
                success: false,
                message: 'Failed to send message',
                error: (error as Error).message
            });
        }
    }

    public async sendMedia(req: Request, res: Response): Promise<void> {
        try {
            const {sessionId} = req.params;
            const {to, type, url, caption, filename} = req.body;

            if (!to || !type || !url) {
                res.status(400).json({
                    success: false,
                    message: 'Missing required fields'
                });
                return;
            }

            const session = sessionManager.getSessionInfo(sessionId);
            if (!session) {
                res.status(404).json({
                    success: false,
                    message: 'Session not found'
                });
                return;
            }

            const media: any = {
                type,
                caption,
                filename,
                url
            };


            const result = await whatsAppService.sendMediaMessage(
                sessionId,
                to,
                media
            );

            res.json({
                success: true,
                message: 'Media message sent successfully',
                data: result
            });
        } catch (error) {
            logger.error({error, sessionId: req.params.sessionId}, 'Failed to send media message');
            res.status(500).json({
                success: false,
                message: 'Failed to send media message',
                error: (error as Error).message
            });
        }
    }
}

export const messageController = new MessageController();
