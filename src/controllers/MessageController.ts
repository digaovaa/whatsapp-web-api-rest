import {Request, Response} from 'express';
import {WhatsAppService} from '../services/WhatsAppService';
import {sessionManager} from '../core/sessions/SessionManager';
import logger from '../utils/logger';

/**
 * Controller for handling WhatsApp message operations
 */
export class MessageController {
    private whatsappService = new WhatsAppService();

    /**
     * Send a text message
     */
    public async sendText(req: Request, res: Response): Promise<void> {
        try {
            const {sessionId} = req.params;
            const {to, text} = req.body;

            // Validate required fields
            if (!to || !text) {
                res.status(400).json({
                    success: false,
                    message: 'Missing required fields: to, text'
                });
                return;
            }

            // Check if session exists and is connected
            const session = sessionManager.getSessionInfo(sessionId);
            if (!session) {
                res.status(404).json({
                    success: false,
                    message: 'Session not found'
                });
                return;
            }

            // Send the message
            const result = await this.whatsappService.sendTextMessage(
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

    /**
     * Send a media message (image, video, document, etc.)
     */
    public async sendMedia(req: Request, res: Response): Promise<void> {
        try {
            const {sessionId} = req.params;
            const {to, type, url, caption, filename} = req.body;

            // Validate required fields
            if (!to || !type || !url) {
                res.status(400).json({
                    success: false,
                    message: 'Missing required fields'
                });
                return;
            }

            // Check if session exists and is connected
            const session = sessionManager.getSessionInfo(sessionId);
            if (!session) {
                res.status(404).json({
                    success: false,
                    message: 'Session not found'
                });
                return;
            }

            // Set up media parameters
            const media: any = {
                type,
                caption,
                filename,
                url
            };


            const result = await this.whatsappService.sendMediaMessage(
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

// Export controller instance
export const messageController = new MessageController();
