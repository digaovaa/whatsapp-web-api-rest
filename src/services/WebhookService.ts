import { EventEmitter } from '../core/events/EventEmitter';
import { MessageEvent, QRCodeEvent, SessionEvent, WebhookConfig, WebhookEventType } from '../core/types';
import axios from 'axios';
import logger from '../utils/logger';
import crypto from 'crypto';

/**
 * Service for handling webhook notifications
 */
export class WebhookService {
  private static instance: WebhookService;
  
  // Store webhook configurations by sessionId
  private webhooks: Map<string, WebhookConfig> = new Map();

  private constructor() {
    // Listen for all types of events
    EventEmitter.onWebhookEvent(WebhookEventType.SESSION_UPDATE, this.handleSessionEvent.bind(this));
    EventEmitter.onWebhookEvent(WebhookEventType.QR_CODE, this.handleQREvent.bind(this));
    EventEmitter.onWebhookEvent(WebhookEventType.MESSAGE, this.handleMessageEvent.bind(this));
    EventEmitter.onWebhookEvent(WebhookEventType.MESSAGE_ACK, this.handleMessageAckEvent.bind(this));
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): WebhookService {
    if (!WebhookService.instance) {
      WebhookService.instance = new WebhookService();
    }
    return WebhookService.instance;
  }

  /**
   * Register a webhook URL for a specific session
   */
  public registerWebhook(
    sessionId: string, 
    url: string, 
    events: WebhookEventType[] = Object.values(WebhookEventType),
    secret?: string
  ): WebhookConfig {
    const webhookConfig: WebhookConfig = {
      url,
      events,
      secret,
      createdAt: new Date()
    };
    
    this.webhooks.set(sessionId, webhookConfig);
    logger.info({ sessionId, url, events }, 'Webhook registered');
    
    return webhookConfig;
  }

  /**
   * Unregister a webhook for a session
   */
  public unregisterWebhook(sessionId: string): boolean {
    const result = this.webhooks.delete(sessionId);
    if (result) {
      logger.info({ sessionId }, 'Webhook unregistered');
    }
    return result;
  }

  /**
   * Get webhook configuration for a session
   */
  public getWebhook(sessionId: string): WebhookConfig | undefined {
    return this.webhooks.get(sessionId);
  }

  /**
   * Send data to a webhook with optional HMAC signing
   */
  private async sendToWebhook(
    sessionId: string, 
    eventType: WebhookEventType, 
    data: any
  ): Promise<boolean> {
    try {
      const webhook = this.webhooks.get(sessionId);
      if (!webhook || !webhook.url || !webhook.events.includes(eventType)) {
        return false;
      }

      // Prepare payload
      const payload = {
        event: eventType,
        sessionId,
        timestamp: new Date().toISOString(),
        data
      };
      
      // Headers for the request
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'WhatsApp-API-Webhook'
      };
      
      // Add HMAC signature if a secret is configured
      if (webhook.secret) {
        const stringPayload = JSON.stringify(payload);
        const signature = crypto
          .createHmac('sha256', webhook.secret)
          .update(stringPayload)
          .digest('hex');
        
        headers['X-Webhook-Signature'] = signature;
      }
      
      // Send the webhook with a timeout of 5 seconds
      const response = await axios.post(webhook.url, payload, {
        headers,
        timeout: 5000
      });
      
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

  /**
   * Handle session status update events
   */
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

  /**
   * Handle QR code update events
   */
  private async handleQREvent(event: QRCodeEvent): Promise<void> {
    await this.sendToWebhook(
      event.sessionId,
      WebhookEventType.QR_CODE,
      {
        qr: event.qr
      }
    );
  }

  /**
   * Handle incoming message events
   */
  private async handleMessageEvent(event: MessageEvent): Promise<void> {
    await this.sendToWebhook(
      event.sessionId,
      WebhookEventType.MESSAGE,
      {
        messageType: event.messageType,
        content: event.content,
        from: event.from,
        timestamp: event.timestamp,
        // Include the raw message for advanced use cases
        rawMessage: event.message
      }
    );
  }

  /**
   * Handle message acknowledgment events
   */
  private async handleMessageAckEvent(event: any): Promise<void> {
    await this.sendToWebhook(
      event.sessionId,
      WebhookEventType.MESSAGE_ACK,
      event
    );
  }
}

// Export singleton instance
export const webhookService = WebhookService.getInstance();
