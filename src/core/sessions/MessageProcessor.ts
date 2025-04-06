import {downloadMediaMessage, getContentType, proto, WAMessageKey} from '@whiskeysockets/baileys';
import {MessageEvent} from '../types';
import logger from '../../utils/logger';
import {createWriteStream} from "node:fs";
import {v4} from "uuid";

/**
 * Utility class for processing WhatsApp messages
 */
export class MessageProcessor {
    /**
     * Process a WhatsApp message into a standardized format
     */
    public static async processMessage(
        sock: any,
        message: proto.IWebMessageInfo,
        sessionId: string
    ): Promise<MessageEvent | null> {
        logger.info({message}, "Message received in proccessor")

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
            const messageType = getContentType(messageContent);
            const content: any = {};


            if (messageType === "imageMessage") {
                const stream = await downloadMediaMessage(
                    message,
                    'stream',
                    {},
                    {
                        logger,
                        reuploadRequest: sock.updateMediaMessage
                    }
                )
                const writeStream = createWriteStream('./' + v4() + '.jpeg')
                stream.pipe(writeStream)
            }


            if (messageType === "stickerMessage") {
                const stream = await downloadMediaMessage(
                    message,
                    'stream',
                    {},
                    {
                        logger,
                        reuploadRequest: sock.updateMediaMessage
                    }
                )
                const writeStream = createWriteStream('./' + v4() + '.webp')
                stream.pipe(writeStream)
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
            case 0:
                return 'ERROR';
            case 1:
                return 'PENDING';
            case 2:
                return 'SERVER_ACK';
            case 3:
                return 'DELIVERY_ACK';
            case 4:
                return 'READ';
            case 5:
                return 'PLAYED';
            default:
                return 'UNKNOWN';
        }
    }
}
