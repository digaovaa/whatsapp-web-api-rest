import type { WASocket, proto } from 'baileys';

export enum SessionStatus {
  STARTING = 'starting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  SCANNING_QR = 'scanning_qr',
  STOPPED = 'stopped',
  FAILED = 'failed'
}

export interface SessionInfo {
  id: string;
  status: SessionStatus;
  userId: string;
  createdAt: Date;
  lastUsed: Date;
  qr?: string | null;
}

export interface ActiveSession {
  socket: WASocket;
  info: SessionInfo;
}

export interface QRCodeEvent {
  sessionId: string;
  qr: string;
}

export interface SessionEvent {
  sessionId: string;
  status: SessionStatus;
  data?: any;
}


export interface MessageEvent {
  sessionId: string;
  userId: string;
  messageType: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contact' | 'sticker' | 'unknown';
  message: proto.IWebMessageInfo;
  timestamp: number;
  from: string;
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
    [key: string]: any;
  };
}

export enum WebhookEventType {
  SESSION_UPDATE = 'session_update',
  QR_CODE = 'qr_code',
  MESSAGE = 'incoming',
  MESSAGE_ACK = 'incoming.ack'
}
