import {sessionManager} from '../core/sessions/SessionManager';
import {SessionStatus} from '../core/types';
import logger from '../utils/logger';
import mime from "mime-types";
import {AnyMediaMessageContent, proto, WAMediaUpload} from "@whiskeysockets/baileys";

/**
 * Service for WhatsApp messaging functionality
 */
export class WhatsAppService {
    /**
     * Send a text message
     * @param sessionId The session ID to use
     * @param to Recipient phone number
     * @param text Message content
     * @returns Message send result
     */
    public async sendTextMessage(
        sessionId: string,
        to: string,
        text: string
    ): Promise<any> {
        try {
            const session = sessionManager.getSession(sessionId);

            if (!session) {
                throw new Error('Session not found');
            }

            // Format the phone number (ensure it has the correct format with country code)
            const formattedNumber = this.formatPhoneNumber(to);

            // Send the message
            const result = await session.socket.sendMessage(formattedNumber, {
                text
            });

            // Update last used timestamp
            session.info.lastUsed = new Date();

            return result;
        } catch (error) {
            logger.error({error, sessionId, to}, 'Failed to send text message');
            throw error;
        }
    }

    /**
     * Send a media message (image, video, document, etc.) from a URL
     * @param sessionId The session ID to use
     * @param to Recipient phone number
     * @param media Media content configuration
     * @returns Message send result
     */
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
            const formattedNumber = this.formatPhoneNumber(to);
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

            // Send the message using the proper Baileys typing
            const result = await session.socket.sendMessage(formattedNumber, content);

            session.info.lastUsed = new Date();

            return result;
        } catch (error) {
            logger.error({error, sessionId, to, mediaType: media.type}, 'Failed to send media message');
            throw error;
        }
    }

    /**
     * Get MIME type from URL
     * @param url URL of the media
     * @param type Media type (used as fallback)
     * @returns MIME type string
     */
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

    /**
     * Extract filename from URL
     * @param url URL of the media
     * @returns Filename string
     */
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

    /**
     * Send a location message
     * @param sessionId The session ID to use
     * @param to Recipient phone number
     * @param latitude Latitude coordinate
     * @param longitude Longitude coordinate
     * @param name Optional location name
     * @param address Optional location address
     * @returns Message send result
     */
    public async sendLocationMessage(
        sessionId: string,
        to: string,
        latitude: number,
        longitude: number,
        name?: string,
        address?: string
    ): Promise<any> {
        try {
            const session = sessionManager.getSession(sessionId);

            if (!session) {
                throw new Error('Session not found');
            }

            if (session.info.status !== SessionStatus.CONNECTED) {
                throw new Error(`Session is not connected (current status: ${session.info.status})`);
            }

            // Format the phone number
            const formattedNumber = this.formatPhoneNumber(to);

            // Prepare location message
            const content = {
                location: {
                    degreesLatitude: latitude,
                    degreesLongitude: longitude,
                    name: name,
                    address: address
                }
            };

            // Send the message
            const result = await session.socket.sendMessage(formattedNumber, content);

            // Update last used timestamp
            session.info.lastUsed = new Date();

            return result;
        } catch (error) {
            logger.error({error, sessionId, to}, 'Failed to send location message');
            throw error;
        }
    }

    /**
     * Send a contact card message
     * @param sessionId The session ID to use
     * @param to Recipient phone number
     * @param contact Contact information
     * @returns Message send result
     */
    public async sendContactMessage(
        sessionId: string,
        to: string,
        contact: {
            fullName: string,
            phoneNumber: string,
            organization?: string,
            email?: string
        }
    ): Promise<any> {
        try {
            const session = sessionManager.getSession(sessionId);

            if (!session) {
                throw new Error('Session not found');
            }

            if (session.info.status !== SessionStatus.CONNECTED) {
                throw new Error(`Session is not connected (current status: ${session.info.status})`);
            }

            // Format the phone number
            const formattedNumber = this.formatPhoneNumber(to);

            // Prepare vCard data
            const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${contact.fullName}
TEL;type=CELL;type=VOICE;waid=${contact.phoneNumber}:${contact.phoneNumber}
${contact.organization ? `ORG:${contact.organization}\
` : ''}
${contact.email ? `EMAIL:${contact.email}\
` : ''}
END:VCARD`;

            // Prepare contact message
            const content = {
                contacts: {
                    displayName: contact.fullName,
                    contacts: [{vcard}]
                }
            };

            // Send the message
            const result = await session.socket.sendMessage(formattedNumber, content);

            // Update last used timestamp
            session.info.lastUsed = new Date();

            return result;
        } catch (error) {
            logger.error({error, sessionId, to}, 'Failed to send contact message');
            throw error;
        }
    }

    /**
     * Send a button message (template)
     * @param sessionId The session ID to use
     * @param to Recipient phone number
     * @param template Template message configuration
     * @returns Message send result
     */
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
        try {
            const session = sessionManager.getSession(sessionId);

            if (!session) {
                throw new Error('Session not found');
            }

            if (session.info.status !== SessionStatus.CONNECTED) {
                throw new Error(`Session is not connected (current status: ${session.info.status})`);
            }

            // Format the phone number
            const formattedNumber = this.formatPhoneNumber(to);

            // Prepare buttons
            const buttons = template.buttons.map(button => ({
                buttonId: button.id,
                buttonText: {displayText: button.text},
                type: 1
            }));

            // Prepare template message
            const content = {
                text: template.text,
                footer: template.footer,
                buttons: buttons,
                headerType: 1
            };

            // Send the message
            const result = await session.socket.sendMessage(formattedNumber, content);

            // Update last used timestamp
            session.info.lastUsed = new Date();

            return result;
        } catch (error) {
            logger.error({error, sessionId, to}, 'Failed to send template message');
            throw error;
        }
    }

    /**
     * Format phone number to WhatsApp format
     * @param phoneNumber Phone number to format
     * @returns Formatted phone number for WhatsApp
     */
    private formatPhoneNumber(phoneNumber: string): string {
        // Remove any non-numeric characters
        const cleaned = phoneNumber.replace(/\D/g, '');

        // Ensure it has @s.whatsapp.net suffix
        return cleaned.includes('@') ? cleaned : `${cleaned}@s.whatsapp.net`;
    }

    /**
     * Check if a phone number exists on WhatsApp
     * @param sessionId The session ID to use
     * @param phoneNumber Phone number to check
     * @returns Boolean indicating if the number exists
     */
    public async checkPhoneNumberExists(
        sessionId: string,
        phoneNumber: string
    ): Promise<boolean> {
        try {
            const session = sessionManager.getSession(sessionId);

            if (!session) {
                throw new Error('Session not found');
            }

            if (session.info.status !== SessionStatus.CONNECTED) {
                throw new Error(`Session is not connected (current status: ${session.info.status})`);
            }

            // Clean the phone number
            const cleaned = phoneNumber.replace(/\D/g, '');

            // Check if the number exists on WhatsApp
            const result = await session.socket.onWhatsApp(cleaned);

            return result?.at(0)?.exists ? true : false;
        } catch (error) {
            logger.error({error, sessionId, phoneNumber}, 'Failed to check phone number');
            throw error;
        }
    }

    /**
     * Get user profile picture
     * @param sessionId The session ID to use
     * @param phoneNumber Phone number to get picture for
     * @returns URL of the profile picture or null if not available
     */
    public async getProfilePicture(
        sessionId: string,
        phoneNumber: string
    ): Promise<string | null> {
        try {
            const session = sessionManager.getSession(sessionId);

            if (!session) {
                throw new Error('Session not found');
            }

            if (session.info.status !== SessionStatus.CONNECTED) {
                throw new Error(`Session is not connected (current status: ${session.info.status})`);
            }

            // Format the phone number
            const formattedNumber = this.formatPhoneNumber(phoneNumber);

            // Get profile picture URL
            const url = await session.socket.profilePictureUrl(formattedNumber);

            return url || null;
        } catch (error) {
            // If there's no profile picture, this will throw an error
            logger.debug({sessionId, phoneNumber}, 'No profile picture available');
            return null;
        }
    }

    /**
     * Get user status/about
     * @param sessionId The session ID to use
     * @param phoneNumber Phone number to get status for
     * @returns Status text or null if not available
     */
    public async getUserStatus(
        sessionId: string,
        phoneNumber: string
    ): Promise<string | null> {
        try {
            const session = sessionManager.getSession(sessionId);

            if (!session) {
                throw new Error('Session not found');
            }

            if (session.info.status !== SessionStatus.CONNECTED) {
                throw new Error(`Session is not connected (current status: ${session.info.status})`);
            }

            // Format the phone number
            const formattedNumber = this.formatPhoneNumber(phoneNumber);

            // Get status - the result might be an array or an object with a status property
            const statusResult = await session.socket.fetchStatus(formattedNumber);

            // Fix for TypeScript error: Handle different possible return types
            if (!statusResult) return null;

            // If it's an array, check the first item
            if (Array.isArray(statusResult)) {
                // If it has a status property, return that
                if ('status' in statusResult[0]) {
                    return statusResult[0].status as string || null;
                }

                // If it has a content property, return that
                if ('content' in statusResult[0]) {
                    return statusResult[0].content as string || null;
                }
            }

            // Try to stringify if it's an object with unknown structure
            if (typeof statusResult === 'object') {
                try {
                    return JSON.stringify(statusResult);
                } catch (e) {
                    return 'Status available but in unsupported format';
                }
            }

            // If it's a string, return directly
            if (typeof statusResult === 'string') {
                return statusResult;
            }

            return null;
        } catch (error) {
            logger.debug({error, sessionId, phoneNumber}, 'Failed to get user status');
            return null;
        }
    }
}

// Export an instance of the service
export const whatsAppService = new WhatsAppService();
