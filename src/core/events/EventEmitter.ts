import {EventEmitter as NativeEventEmitter} from 'events';
import {MessageEvent, QRCodeEvent, SessionEvent, WebhookEventType} from '../types';


class SessionEventEmitter extends NativeEventEmitter {
    private static instance: SessionEventEmitter;

    private constructor() {
        super();
    }

    public static getInstance(): SessionEventEmitter {
        if (!SessionEventEmitter.instance) {
            SessionEventEmitter.instance = new SessionEventEmitter();
        }
        return SessionEventEmitter.instance;
    }


    public emitQR(event: QRCodeEvent): void {
        this.emit(WebhookEventType.QR_CODE, event);
    }


    public emitSessionUpdate(event: SessionEvent): void {
        this.emit(WebhookEventType.SESSION_UPDATE, event);
    }

    public emitMessage(event: MessageEvent): void {
        this.emit(WebhookEventType.MESSAGE, event);
    }

    public emitMessageAck(event: any): void {
        this.emit(WebhookEventType.MESSAGE_ACK, event);
    }

    public onQR(listener: (event: QRCodeEvent) => void): void {
        this.on(WebhookEventType.QR_CODE, listener);
    }

    public onSessionUpdate(listener: (event: SessionEvent) => void): void {
        this.on(WebhookEventType.SESSION_UPDATE, listener);
    }

    public onMessage(listener: (event: MessageEvent) => void): void {
        this.on(WebhookEventType.MESSAGE, listener);
    }

    public onMessageAck(listener: (event: any) => void): void {
        this.on(WebhookEventType.MESSAGE_ACK, listener);
    }

    public onWebhookEvent(eventType: WebhookEventType, listener: (event: any) => void): void {
        this.on(eventType, listener);
    }
}

export const EventEmitter = SessionEventEmitter.getInstance();
