/**
 * Session storage interface - allows swapping storage implementations
 */
export interface StorageProvider {
  read(path: string): Promise<any>;
  write(path: string, data: any): Promise<void>;
  exists(path: string): Promise<boolean>;
  delete(path: string): Promise<void>;
}

/**
 * Session data interface
 */
export interface SessionData {
  key: string;
  webhook?: string | boolean;
  webhookUrl?: string;
  browser?: string;
  webhookEvents?: string[];
  messagesRead?: boolean;
  ignoreGroups?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Message types
 */
export interface TextMessage {
  to: string;
  text: string;
  replyTo?: string;
}

export interface MediaMessage {
  to: string;
  mediaPath?: string;
  mediaUrl?: string;
  mediaBase64?: string;
  caption?: string;
  replyTo?: string;
}

/**
 * API Response types
 */
export interface ApiResponse<T = any> {
  error: boolean;
  message: string;
  data?: T;
}
