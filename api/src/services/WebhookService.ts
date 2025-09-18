import { EventEmitter } from '../core/events/EventEmitter';
import { MessageEvent, QRCodeEvent, SessionEvent, WebhookEventType } from '../core/types';
import logger from '../utils/logger';
import { rabbitConfig } from "../config/env";
import * as amqp from 'amqplib';

export class WebhookService {
    private static instance: WebhookService;

    private connection: any = null;
    private channel: amqp.Channel | null = null;
    private isConnecting = false;

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

    private async ensureChannel(): Promise<amqp.Channel> {
        if (this.channel) return this.channel;
        if (this.isConnecting) {
            // pequeno backoff até conexão ficar pronta
            await new Promise(r => setTimeout(r, 200));
            return this.ensureChannel();
        }
        this.isConnecting = true;
        try {
            const conn = await amqp.connect(rabbitConfig.AMQP_URI);
            this.connection = conn;
            const ch = await conn.createChannel();
            this.channel = ch;

            const exchange = rabbitConfig.AMQP_EXCHANGE;

            await ch.assertExchange(exchange, 'topic', { durable: true });

            conn.on('close', () => {
                logger.warn('RabbitMQ connection closed');
                this.connection = null;
                this.channel = null;
            });
            conn.on('error', (err: any) => {
                logger.error({ err }, 'RabbitMQ connection error');
            });
            return ch;
        } finally {
            this.isConnecting = false;
        }
    }

    private async publish(
        sessionId: string,
        eventType: WebhookEventType,
        data: any
    ): Promise<boolean> {
        try {
            const ch = await this.ensureChannel();
            const exchange = rabbitConfig.AMQP_EXCHANGE;
            const routingKey = `${rabbitConfig.AMQP_EXCHANGE}.baileys.${eventType}`;
            const payload = Buffer.from(JSON.stringify({
                instanceID: sessionId,
                companyID: data.CompanyID,
                payload: data.Payload,
                whatsappID: data.WhatsappID,
            }));
            const ok = ch.publish(exchange, routingKey, payload, { contentType: 'application/json', persistent: true });
            if (!ok) {
                logger.warn({ routingKey }, 'RabbitMQ publish returned false (write buffer full)');
            }
            logger.debug({ sessionId, event: eventType, routingKey }, 'Event published to RabbitMQ');
            return true;
        } catch (error) {
            logger.error({ error, sessionId, event: eventType }, 'Failed to publish to RabbitMQ');
            return false;
        }
    }

    private async handleSessionEvent(event: SessionEvent): Promise<void> {
        await this.publish(
            event.sessionId,
            WebhookEventType.SESSION_UPDATE,
            {
                status: event.status,
                data: event.data
            }
        );
    }

    private async handleQREvent(event: QRCodeEvent): Promise<void> {
        await this.publish(
            event.sessionId,
            WebhookEventType.QR_CODE,
            {
                qr: event.qr
            }
        );
    }

    private async handleMessageEvent(event: MessageEvent): Promise<void> {
        const payload = {
            InstanceID: event.sessionId,
            CompanyID: event.userId,
            Payload: event.message,
            WhatsappID: event.from
        };

        await this.publish(
            event.sessionId,
            WebhookEventType.MESSAGE,
            payload
        );
    }

    private async handleMessageAckEvent(event: any): Promise<void> {
        await this.publish(
            event.sessionId,
            WebhookEventType.MESSAGE_ACK,
            event
        );
    }
}

export const webhookService = WebhookService.getInstance();
