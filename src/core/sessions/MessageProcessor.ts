import { downloadMediaMessage, getContentType, proto, WAMessageKey } from '@whiskeysockets/baileys';
import { MessageEvent, SessionInfo } from '../types';
import logger from '../../utils/logger';
import { createWriteStream } from "node:fs";
import { v4 } from "uuid";
import { getMimeType } from "../../utils/getMimeType";
import { pipeline } from "node:stream/promises";
import { storage } from '../repositories/Storage';
import * as fs from 'fs';

const mediaMessagesTypes = [
    "audioMessage",
    "videoMessage",
    "imageMessage",
    "stickerMessage",
    "documentMessage"
]

export class MessageProcessor {

    public static async processMessage(
        sock: any,
        message: proto.IWebMessageInfo,
        sessionInfo: SessionInfo
    ): Promise<MessageEvent | null> {
        try {
            if (!message.key) {
                return null;
            }

            const messageContent = message.message;
            if (!messageContent) {
                return null;
            }

            const from = message.key.remoteJid;
            if (!from) {
                return null;
            }

            const messageType = getContentType(messageContent);
            const content: any = {};

            if (messageType && mediaMessagesTypes.includes(messageType)) {
                let mimeType = ""

                if (messageType === "imageMessage") {
                    mimeType = 'jpeg'
                }

                if (messageType === "stickerMessage") {
                    mimeType = 'webp'
                }

                if (messageType === "videoMessage") {
                    mimeType = 'mp4'
                }

                if (messageType === "audioMessage") {
                    mimeType = 'ogg'
                }

                if (messageType === "documentMessage" && messageContent.documentMessage) {
                    mimeType = getMimeType(messageContent.documentMessage)
                }

                if (mimeType.length) {
                    try {
                        const fileName = v4() + "." + mimeType;
                        const filepath = './' + fileName;

                        const stream = await downloadMediaMessage(message, 'stream', {}, {
                            logger,
                            reuploadRequest: sock.updateMediaMessage
                        })

                        await pipeline(stream, createWriteStream(filepath));
                        const url = await storage.uploadFile(filepath, sessionInfo.id + "/uploads/" + fileName);
                        fs.unlinkSync(filepath);
                        content.fileError = url.error;
                        content.filename = url.publicUrl;
                    } catch (e) {
                        logger.error(e)
                    }
                }
            }

            if (messageContent.extendedTextMessage?.contextInfo?.quotedMessage) {
                content.quotedMessage = messageContent.extendedTextMessage.contextInfo.quotedMessage;
            }

            if (messageContent.extendedTextMessage?.contextInfo?.mentionedJid) {
                content.mentionedIds = messageContent.extendedTextMessage.contextInfo.mentionedJid;
            }

            return {
                sessionId: sessionInfo.id,
                userId: sessionInfo.userId,
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
                sessionId: sessionInfo.id,
                messageId: message.key?.id
            }, 'Failed to process message');
            return null;
        }
    }

    public static processMessageAck(
        messageKey: WAMessageKey,
        status: number,
        sessionInfo: SessionInfo
    ): any {
        return {
            sessionId: sessionInfo.id,
            userId: sessionInfo.userId,
            messageId: messageKey.id,
            remoteJid: messageKey.remoteJid,
            fromMe: messageKey.fromMe,
            status,
            timestamp: Date.now(),
            statusDescription: this.getStatusDescription(status)
        };
    }

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
