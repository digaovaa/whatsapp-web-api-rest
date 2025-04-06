import { EventEmitter as NativeEventEmitter } from 'events';
import { MessageEvent, QRCodeEvent, SessionEvent, WebhookEventType } from '../types';

/**
 * Custom event emitter for session events
 */
class SessionEventEmitter extends NativeEventEmitter {
  // Singleton instance
  private static instance: SessionEventEmitter;

  private constructor() {
    super();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): SessionEventEmitter {
    if (!SessionEventEmitter.instance) {
      SessionEventEmitter.instance = new SessionEventEmitter();
    }
    return SessionEventEmitter.instance;
  }

  /**
   * Emit QR code update event
   */
  public emitQR(event: QRCodeEvent): void {
    // Emit a single event for QR updates
    this.emit(WebhookEventType.QR_CODE, event);
  }

  /**
   * Emit session status update event
   */
  public emitSessionUpdate(event: SessionEvent): void {
    // Emit a single event for session updates
    this.emit(WebhookEventType.SESSION_UPDATE, event);
  }

  /**
   * Emit incoming message event
   */
  public emitMessage(event: MessageEvent): void {
    // Emit a single event for messages
    this.emit(WebhookEventType.MESSAGE, event);
  }

  /**
   * Emit message acknowledgment event
   */
  public emitMessageAck(event: any): void {
    // Emit a single event for message acknowledgments
    this.emit(WebhookEventType.MESSAGE_ACK, event);
  }

  /**
   * Register listener for QR code updates
   */
  public onQR(listener: (event: QRCodeEvent) => void): void {
    this.on(WebhookEventType.QR_CODE, listener);
  }

  /**
   * Register listener for session status updates
   */
  public onSessionUpdate(listener: (event: SessionEvent) => void): void {
    this.on(WebhookEventType.SESSION_UPDATE, listener);
  }

  /**
   * Register listener for incoming messages
   */
  public onMessage(listener: (event: MessageEvent) => void): void {
    this.on(WebhookEventType.MESSAGE, listener);
  }

  /**
   * Register listener for message acknowledgments
   */
  public onMessageAck(listener: (event: any) => void): void {
    this.on(WebhookEventType.MESSAGE_ACK, listener);
  }

  /**
   * Register listener for a specific webhook event type
   */
  public onWebhookEvent(eventType: WebhookEventType, listener: (event: any) => void): void {
    this.on(eventType, listener);
  }
}

// Export singleton instance
export const EventEmitter = SessionEventEmitter.getInstance();
