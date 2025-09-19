import {sessionManager} from '../core/sessions/SessionManager';
import {SessionStatus} from '../core/types';
import logger from '../utils/logger';
import mime from "mime-types";
import {AnyMediaMessageContent, proto, WAMediaUpload} from "baileys";

export class WhatsAppService {

    public async downloadProfile(sessionId: string, of: string) {
        const session = sessionManager.getSession(sessionId);

        if (!session) {
            throw new Error('Session not found');
        }

        const result = await session.socket.onWhatsApp(of);

        if (result && result.at(0)) {
            return await session.socket.profilePictureUrl(result.at(0)!.jid, 'image');
        }
    }

    public async sendTextMessage(
        sessionId: string,
        to: string,
        text: string
    ): Promise<proto.WebMessageInfo | undefined> {
        const session = sessionManager.getSession(sessionId);

        if (!session) {
            throw new Error('Session not found');
        }

        try {
            const formattedNumber = this.formatPhoneNumber(to);

            const result = await session.socket.sendMessage(formattedNumber, {
                text
            });

            session.info.lastUsed = new Date();

            return result;
        } catch (error) {
            logger.error({error, sessionId, to}, 'Failed to send text message');
            throw error;
        }
    }

    public async sendMediaMessage(
        sessionId: string,
        to: string,
        media: {
            type: 'image' | 'video' | 'document' | 'audio' | 'sticker',
            url: string,
            caption?: string,
            filename?: string
        }
    ): Promise<proto.WebMessageInfo | undefined> {
        const session = sessionManager.getSession(sessionId);

        if (!session) {
            throw new Error('Session not found');
        }

        try {
            const formattedNumber = to.includes("@") ? to : this.formatPhoneNumber(to);
            const mimeType = this.getMimeTypeFromUrl(media.url, media.type);
            const filename = media.filename || this.getFilenameFromUrl(media.url);

            const mediaPayload: WAMediaUpload = {
                url: media.url
            };

            let content: AnyMediaMessageContent;

            switch (media.type) {
                case 'image':
                    content = {
                        image: mediaPayload,
                        caption: media.caption,
                        mimetype: mimeType
                    };
                    break;

                case 'video':
                    content = {
                        video: mediaPayload,
                        caption: media.caption,
                        mimetype: mimeType
                    };
                    break;

                case 'document':
                    content = {
                        document: mediaPayload,
                        caption: media.caption,
                        mimetype: mimeType,
                        fileName: filename
                    };
                    break;

                case 'audio':
                    content = {
                        audio: mediaPayload,
                        mimetype: mimeType,
                        ptt: true // Send as voice note
                    };
                    break;

                case 'sticker':
                    content = {
                        sticker: mediaPayload,
                        mimetype: mimeType || 'image/webp'
                    };
                    break;

                default:
                    throw new Error(`Unsupported media type: ${media.type}`);
            }

            const result = await session.socket.sendMessage(formattedNumber, content);

            session.info.lastUsed = new Date();

            return result;
        } catch (error) {
            logger.error({error, sessionId, to, mediaType: media.type}, 'Failed to send media message');
            throw error;
        }
    }

    private getMimeTypeFromUrl(url: string, type: string): string {
        const fallbackMimeTypes: Record<string, string> = {
            'image': 'image/jpeg',
            'video': 'video/mp4',
            'document': 'application/octet-stream',
            'audio': 'audio/mpeg',
            'sticker': 'image/webp'
        };

        try {
            if (type === "document") {
                const urlObj = new URL(url);
                const pathname = urlObj.pathname;
                const extension = pathname.split('.').pop()?.toLowerCase();

                if (extension) {
                    const mimeType = mime.lookup(extension);
                    logger.info({pathname, extension, mimeType}, "Searching mimetype")
                    if (mimeType) return mimeType;
                }
            }

            return fallbackMimeTypes[type] || 'application/octet-stream';
        } catch (error) {
            logger.warn({error, url}, 'Failed to detect MIME type from URL');
            return fallbackMimeTypes[type] || 'application/octet-stream';
        }
    }

    private getFilenameFromUrl(url: string): string {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const filename = pathname.split('/').pop();

            return filename || 'file';
        } catch (error) {
            logger.warn({error, url}, 'Failed to extract filename from URL');
            return 'file';
        }
    }

    public async sendLocationMessage(
        sessionId: string,
        to: string,
        latitude: number,
        longitude: number,
        name?: string,
        address?: string
    ): Promise<proto.WebMessageInfo | undefined> {
        const session = sessionManager.getSession(sessionId);

        if (!session) {
            throw new Error('Session not found');
        }

        if (session.info.status !== SessionStatus.CONNECTED) {
            throw new Error(`Session is not connected (current status: ${session.info.status})`);
        }

        try {
            const formattedNumber = this.formatPhoneNumber(to);

            const content = {
                location: {
                    degreesLatitude: latitude,
                    degreesLongitude: longitude,
                    name: name,
                    address: address
                }
            };

            const result = await session.socket.sendMessage(formattedNumber, content);
            session.info.lastUsed = new Date();

            return result;
        } catch (error) {
            logger.error({error, sessionId, to}, 'Failed to send location message');
            throw error;
        }
    }

    public async sendContactMessage(
        sessionId: string,
        to: string,
        contact: {
            fullName: string,
            phoneNumber: string,
            organization?: string,
            email?: string
        }
    ): Promise<proto.WebMessageInfo | undefined> {
        try {
            const session = sessionManager.getSession(sessionId);

            if (!session) {
                throw new Error('Session not found');
            }

            if (session.info.status !== SessionStatus.CONNECTED) {
                throw new Error(`Session is not connected (current status: ${session.info.status})`);
            }

            const formattedNumber = this.formatPhoneNumber(to);

            const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${contact.fullName}
TEL;type=CELL;type=VOICE;waid=${contact.phoneNumber}:${contact.phoneNumber}
${contact.organization ? `ORG:${contact.organization}\
` : ''}
${contact.email ? `EMAIL:${contact.email}\
` : ''}
END:VCARD`;

            const content = {
                contacts: {
                    displayName: contact.fullName,
                    contacts: [{vcard}]
                }
            };

            const result = await session.socket.sendMessage(formattedNumber, content);

            session.info.lastUsed = new Date();

            return result;
        } catch (error) {
            logger.error({error, sessionId, to}, 'Failed to send contact message');
            throw error;
        }
    }

    public async sendTemplateMessage(
        sessionId: string,
        to: string,
        template: {
            text: string,
            footer?: string,
            buttons: Array<{
                id: string,
                text: string
            }>
        }
    ): Promise<any> {
        const session = sessionManager.getSession(sessionId);

        if (!session) {
            throw new Error('Session not found');
        }

        if (session.info.status !== SessionStatus.CONNECTED) {
            throw new Error(`Session is not connected (current status: ${session.info.status})`);
        }

        try {
            const formattedNumber = this.formatPhoneNumber(to);

            const buttons = template.buttons.map(button => ({
                buttonId: button.id,
                buttonText: {displayText: button.text},
                type: 1
            }));

            const content = {
                text: template.text,
                footer: template.footer,
                buttons: buttons,
                headerType: 1
            };

            const result = await session.socket.sendMessage(formattedNumber, content);
            session.info.lastUsed = new Date();

            return result;
        } catch (error) {
            logger.error({error, sessionId, to}, 'Failed to send template message');
            throw error;
        }
    }

    private formatPhoneNumber(phoneNumber: string): string {
        const cleaned = phoneNumber.replace(/\D/g, '');
        return cleaned.includes('@') ? cleaned : `${cleaned}@s.whatsapp.net`;
    }

    public async checkPhoneNumberExists(
        sessionId: string,
        phoneNumber: string
    ): Promise<boolean> {
        const session = sessionManager.getSession(sessionId);

        if (!session) {
            throw new Error('Session not found');
        }

        if (session.info.status !== SessionStatus.CONNECTED) {
            throw new Error(`Session is not connected (current status: ${session.info.status})`);
        }

        try {
            const cleaned = phoneNumber.replace(/\D/g, '');
            const result = await session.socket.onWhatsApp(cleaned);
            return Boolean(result?.at(0)?.exists);
        } catch (error) {
            logger.error({error, sessionId, phoneNumber}, 'Failed to check phone number');
            throw error;
        }
    }

    public async getProfilePicture(
        sessionId: string,
        phoneNumber: string
    ): Promise<string | null> {
        const session = sessionManager.getSession(sessionId);

        if (!session) {
            throw new Error('Session not found');
        }

        if (session.info.status !== SessionStatus.CONNECTED) {
            throw new Error(`Session is not connected (current status: ${session.info.status})`);
        }

        try {
            const formattedNumber = this.formatPhoneNumber(phoneNumber);
            const url = await session.socket.profilePictureUrl(formattedNumber);
            return url || null;
        } catch (error) {
            logger.debug({sessionId, phoneNumber}, 'No profile picture available');
            return null;
        }
    }

    public async getUserStatus(
        sessionId: string,
        phoneNumber: string
    ): Promise<string | null> {
        const session = sessionManager.getSession(sessionId);

        if (!session) {
            throw new Error('Session not found');
        }

        if (session.info.status !== SessionStatus.CONNECTED) {
            throw new Error(`Session is not connected (current status: ${session.info.status})`);
        }

        try {
            const formattedNumber = this.formatPhoneNumber(phoneNumber);
            const statusResult = await session.socket.fetchStatus(formattedNumber);
            if (!statusResult) return null;

            if (Array.isArray(statusResult)) {
                if ('status' in statusResult[0]) {
                    return statusResult[0].status as string || null;
                }

                if ('content' in statusResult[0]) {
                    return statusResult[0].content as string || null;
                }
            }

            if (typeof statusResult === 'object') {
                try {
                    return JSON.stringify(statusResult);
                } catch (e) {
                    return 'Status available but in unsupported format';
                }
            }

            return null;
        } catch (error) {
            logger.debug({error, sessionId, phoneNumber}, 'Failed to get user status');
            return null;
        }
    }

    public async editMessage(
        sessionId: string,
        phoneNumber: string,
        body: string,
        id: string
    ): Promise<any> {
        const session = sessionManager.getSession(sessionId);

        if (!session) {
            throw new Error('Session not found');
        }

        if (session.info.status !== SessionStatus.CONNECTED) {
            throw new Error(`Session is not connected (current status: ${session.info.status})`);
        }

        try {
            const formattedNumber = this.formatPhoneNumber(phoneNumber);
            const result = await session.socket.sendMessage(formattedNumber, {
                text: body,
                edit: {
                    id: id,
                    fromMe: true,
                    remoteJid: formattedNumber
                }
            });
            session.info.lastUsed = new Date();

            return result;
        } catch (error) {
            logger.error({error, sessionId, phoneNumber, body, id}, 'Failed to edit message');
            throw error;
        }
    }
}

export const whatsAppService = new WhatsAppService();
