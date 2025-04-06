import {proto, WAMessageKey} from '@whiskeysockets/baileys';
import {MessageEvent} from '../types';
import logger from '../../utils/logger';

/**
 * Utility class for processing WhatsApp messages
 */
export class MessageProcessor {
  /**
   * Process a WhatsApp message into a standardized format
   */
  public static processMessage(
    message: proto.IWebMessageInfo,
    sessionId: string
  ): MessageEvent | null {
    try {
      // Skip status messages and messages without a key
      if (!message.key) {
        return null;
      }
      
      // Extract the message content
      const messageContent = message.message;
      if (!messageContent) {
        return null;
      }

      // Get the sender's JID
      const from = message.key.remoteJid;
      if (!from) {
        return null;
      }

      // Determine message type and extract relevant content
      let messageType = 'unknown';
      const content: any = {};
      
      // Process different message types
      if (messageContent.conversation) {
        // Text message
        messageType = 'text';
        content.text = messageContent.conversation;
      } 
      else if (messageContent.imageMessage) {
        // Image message
        messageType = 'image';
        content.caption = messageContent.imageMessage.caption;
        content.mimetype = messageContent.imageMessage.mimetype;
        content.url = messageContent.imageMessage.url;
      } 
      else if (messageContent.videoMessage) {
        // Video message
        messageType = 'video';
        content.caption = messageContent.videoMessage.caption;
        content.mimetype = messageContent.videoMessage.mimetype;
        content.url = messageContent.videoMessage.url;
        content.seconds = messageContent.videoMessage.seconds;
      } 
      else if (messageContent.audioMessage) {
        // Audio message
        messageType = 'audio';
        content.mimetype = messageContent.audioMessage.mimetype;
        content.url = messageContent.audioMessage.url;
        content.seconds = messageContent.audioMessage.seconds;
        content.ptt = messageContent.audioMessage.ptt;
      } 
      else if (messageContent.documentMessage) {
        // Document message
        messageType = 'document';
        content.mimetype = messageContent.documentMessage.mimetype;
        content.filename = messageContent.documentMessage.fileName;
        content.url = messageContent.documentMessage.url;
      } 
      else if (messageContent.contactMessage) {
        // Contact message
        messageType = 'contact';
        content.displayName = messageContent.contactMessage.displayName;
        content.vcard = messageContent.contactMessage.vcard;
      } 
      else if (messageContent.locationMessage) {
        // Location message
        messageType = 'location';
        content.location = {
          latitude: messageContent.locationMessage.degreesLatitude,
          longitude: messageContent.locationMessage.degreesLongitude,
          address: messageContent.locationMessage.address
        };
      } 
      else if (messageContent.stickerMessage) {
        // Sticker message
        messageType = 'sticker';
        content.mimetype = messageContent.stickerMessage.mimetype;
        content.url = messageContent.stickerMessage.url;
      }
      
      // Extract quoted message if available
      if (messageContent.extendedTextMessage?.contextInfo?.quotedMessage) {
        content.quotedMessage = messageContent.extendedTextMessage.contextInfo.quotedMessage;
      }

      // Extract mentioned contacts if available
      if (messageContent.extendedTextMessage?.contextInfo?.mentionedJid) {
        content.mentionedIds = messageContent.extendedTextMessage.contextInfo.mentionedJid;
      }

      // Create the message event
      return {
        sessionId,
        messageType: messageType as any,
        message,
        timestamp: message.messageTimestamp
            ? typeof message.messageTimestamp === 'number'
                ? message.messageTimestamp
                : Number(message.messageTimestamp)
            : Date.now() / 1000,
        from,
        content
      };
    } catch (error) {
      logger.error({ 
        error, 
        sessionId, 
        messageId: message.key?.id 
      }, 'Failed to process message');
      return null;
    }
  }

  /**
   * Process acknowledgment status updates
   */
  public static processMessageAck(
    messageKey: WAMessageKey,
    status: number,
    sessionId: string
  ): any {
    return {
      sessionId,
      messageId: messageKey.id,
      remoteJid: messageKey.remoteJid,
      fromMe: messageKey.fromMe,
      status,
      timestamp: Date.now(),
      statusDescription: this.getStatusDescription(status)
    };
  }

  /**
   * Get a human-readable description of the message status
   */
  private static getStatusDescription(status: number): string {
    switch (status) {
      case 0: return 'ERROR';
      case 1: return 'PENDING';
      case 2: return 'SERVER_ACK';
      case 3: return 'DELIVERY_ACK';
      case 4: return 'READ';
      case 5: return 'PLAYED';
      default: return 'UNKNOWN';
    }
  }
}
