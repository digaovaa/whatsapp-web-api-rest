import { Request, Response } from 'express';
import { webhookService } from '../services/WebhookService';
import { WebhookEventType } from '../core/types';
import logger from '../utils/logger';

/**
 * Controller for webhook management
 */
export class WebhookController {
  /**
   * Register a webhook URL for a session
   */
  public registerWebhook(req: Request, res: Response): void {
    try {
      const { sessionId } = req.params;
      const { url, events, secret } = req.body;

      // Validate webhook URL
      if (!url || !this.isValidUrl(url)) {
        res.status(400).json({
          success: false,
          message: 'Invalid webhook URL'
        });
        return;
      }

      // Validate events if provided
      let parsedEvents: WebhookEventType[] = Object.values(WebhookEventType);
      if (events && Array.isArray(events)) {
        parsedEvents = events.filter(event => 
          Object.values(WebhookEventType).includes(event as WebhookEventType)
        ) as WebhookEventType[];
        
        if (parsedEvents.length === 0) {
          res.status(400).json({
            success: false,
            message: 'No valid event types provided',
            validEventTypes: Object.values(WebhookEventType)
          });
          return;
        }
      }

      // Register the webhook
      const webhook = webhookService.registerWebhook(
        sessionId, 
        url, 
        parsedEvents,
        secret
      );

      res.json({
        success: true,
        message: 'Webhook registered successfully',
        data: {
          sessionId,
          url: webhook.url,
          events: webhook.events,
          hasSecret: !!webhook.secret,
          createdAt: webhook.createdAt
        }
      });
    } catch (error) {
      logger.error({ error, sessionId: req.params.sessionId }, 'Failed to register webhook');
      res.status(500).json({
        success: false,
        message: 'Failed to register webhook',
        error: (error as Error).message
      });
    }
  }

  /**
   * Get webhook configuration for a session
   */
  public getWebhook(req: Request, res: Response): void {
    try {
      const { sessionId } = req.params;

      // Get the webhook
      const webhook = webhookService.getWebhook(sessionId);

      if (!webhook) {
        res.status(404).json({
          success: false,
          message: 'No webhook found for this session'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          sessionId,
          url: webhook.url,
          events: webhook.events,
          hasSecret: !!webhook.secret,
          createdAt: webhook.createdAt
        }
      });
    } catch (error) {
      logger.error({ error, sessionId: req.params.sessionId }, 'Failed to get webhook');
      res.status(500).json({
        success: false,
        message: 'Failed to get webhook',
        error: (error as Error).message
      });
    }
  }

  /**
   * Unregister a webhook for a session
   */
  public unregisterWebhook(req: Request, res: Response): void {
    try {
      const { sessionId } = req.params;

      // Unregister the webhook
      const success = webhookService.unregisterWebhook(sessionId);

      if (!success) {
        res.status(404).json({
          success: false,
          message: 'No webhook found for this session'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Webhook unregistered successfully'
      });
    } catch (error) {
      logger.error({ error, sessionId: req.params.sessionId }, 'Failed to unregister webhook');
      res.status(500).json({
        success: false,
        message: 'Failed to unregister webhook',
        error: (error as Error).message
      });
    }
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export controller instance
export const webhookController = new WebhookController();
