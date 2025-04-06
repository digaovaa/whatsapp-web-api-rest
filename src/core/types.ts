import type { WASocket, proto } from '@whiskeysockets/baileys';

/**
 * Session status types
 */
export enum SessionStatus {
  STARTING = 'starting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  SCANNING_QR = 'scanning_qr',
  STOPPED = 'stopped',
  FAILED = 'failed'
}

/**
 * Interface for session information
 */
export interface SessionInfo {
  id: string;
  status: SessionStatus;
  userId: string; // User who owns the session
  createdAt: Date;
  lastUsed: Date;
  qr?: string | null;
}

/**
 * Interface for active session data
 */
export interface ActiveSession {
  socket: WASocket;
  info: SessionInfo;
}

/**
 * Interface for QR code update events
 */
export interface QRCodeEvent {
  sessionId: string;
  qr: string;
}

/**
 * Interface for session events
 */
export interface SessionEvent {
  sessionId: string;
  status: SessionStatus;
  data?: any;
}

/**
 * Interface for message events
 */
export interface MessageEvent {
  sessionId: string;
  messageType: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contact' | 'sticker' | 'unknown';
  message: proto.IWebMessageInfo;
  timestamp: number;
  from: string;
  // Processed message content for easier consumption
  content: {
    text?: string;
    caption?: string;
    mimetype?: string;
    filename?: string;
    url?: string;
    quotedMessage?: any;
    mentionedIds?: string[];
    location?: {
      latitude: number;
      longitude: number;
      address?: string;
    };
    buttons?: any[];
    // Other relevant fields
    [key: string]: any;
  };
}

/**
 * Webhook event types
 */
export enum WebhookEventType {
  SESSION_UPDATE = 'session_update',
  QR_CODE = 'qr_code',
  MESSAGE = 'message',
  MESSAGE_ACK = 'message_ack' // Message delivery/read status updates
}

/**
 * Interface for webhook registration
 */
export interface WebhookConfig {
  url: string;
  events: WebhookEventType[];
  secret?: string; // For HMAC verification
  createdAt: Date;
}
