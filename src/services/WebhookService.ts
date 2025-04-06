import {EventEmitter} from '../core/events/EventEmitter';
import {MessageEvent, QRCodeEvent, SessionEvent, WebhookEventType} from '../core/types';
import axios from 'axios';
import logger from '../utils/logger';
import {webhookUrl} from "../config/database";

export class WebhookService {
    private static instance: WebhookService;

    private constructor() {
        EventEmitter.onWebhookEvent(WebhookEventType.SESSION_UPDATE, this.handleSessionEvent.bind(this));
        EventEmitter.onWebhookEvent(WebhookEventType.QR_CODE, this.handleQREvent.bind(this));
        EventEmitter.onWebhookEvent(WebhookEventType.MESSAGE, this.handleMessageEvent.bind(this));
        EventEmitter.onWebhookEvent(WebhookEventType.MESSAGE_ACK, this.handleMessageAckEvent.bind(this));
    }

    public static getInstance(): WebhookService {
        if (!WebhookService.instance) {
            WebhookService.instance = new WebhookService();
        }
        return WebhookService.instance;
    }


    private async sendToWebhook(
        sessionId: string,
        eventType: WebhookEventType,
        data: any
    ): Promise<boolean> {
        try {
            const payload = {
                event: eventType,
                sessionId,
                timestamp: new Date().toISOString(),
                data
            };

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'User-Agent': 'WhatsApp-API-Webhook'
            };

            const response = await axios.post(
                webhookUrl,
                payload,
                {headers, timeout: 5000}
            );

            if (response.status >= 200 && response.status < 300) {
                logger.debug({
                    sessionId,
                    event: eventType,
                    statusCode: response.status
                }, 'Webhook delivered successfully');
                return true;
            } else {
                logger.warn({
                    sessionId,
                    event: eventType,
                    statusCode: response.status
                }, 'Webhook delivery failed with non-2xx status code');
                return false;
            }
        } catch (error) {
            logger.error({
                error,
                sessionId,
                event: eventType
            }, 'Failed to send webhook');
            return false;
        }
    }

    private async handleSessionEvent(event: SessionEvent): Promise<void> {
        await this.sendToWebhook(
            event.sessionId,
            WebhookEventType.SESSION_UPDATE,
            {
                status: event.status,
                data: event.data
            }
        );
    }

    private async handleQREvent(event: QRCodeEvent): Promise<void> {
        await this.sendToWebhook(
            event.sessionId,
            WebhookEventType.QR_CODE,
            {
                qr: event.qr
            }
        );
    }

    private async handleMessageEvent(event: MessageEvent): Promise<void> {
        await this.sendToWebhook(
            event.sessionId,
            WebhookEventType.MESSAGE,
            {
                messageType: event.messageType,
                content: event.content,
                from: event.from,
                timestamp: event.timestamp,
                rawMessage: event.message
            }
        );
    }

    private async handleMessageAckEvent(event: any): Promise<void> {
        await this.sendToWebhook(
            event.sessionId,
            WebhookEventType.MESSAGE_ACK,
            event
        );
    }
}

export const webhookService = WebhookService.getInstance();
