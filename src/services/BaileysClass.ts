import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import makeWASocket, {
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    makeInMemoryStore,
    proto,
    WAMessageContent,
    WAMessageKey
} from '@whiskeysockets/baileys';
import { EventEmitter } from 'events';
import { fileTypeFromFile } from 'file-type';
import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import { existsSync, readFileSync, rmSync } from 'fs';
import mime from 'mime-types';
import useMySQLAuthState from 'mysql-baileys';
import NodeCache from 'node-cache';
import path from 'path';
import pino, { Logger } from 'pino';
import QRCode from 'qrcode';


interface Args {
    debug?: boolean;
    name: string;
    dir: string;
    [key: string]: any;  // Define the shape of this object as needed
}

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const msgRetryCounterCache = new NodeCache();

export class BaileysClass extends EventEmitter {
    private vendor: any;
    private store: ReturnType<typeof makeInMemoryStore> | null;
    private globalVendorArgs: Args;
    private sock: any;
    private NAME_DIR_SESSION: string;
    private qr: string | null = null;

    constructor(args: Args) {
        super();
        this.vendor = null;
        this.store = null;
        this.globalVendorArgs = {
            ...args,
            usePairingCode: false,
            phoneNumber: null,
            gifPlayback: false,
            dir: args.dir ?? './',
            debug: args.debug ?? false,
        };
        this.NAME_DIR_SESSION = `${this.globalVendorArgs.dir}${this.globalVendorArgs.name}_sessions`;
    }

    getChats = async (): Promise<any[]> => {
        if (!this.store) return [];
        const chats = this.store.chats.all();
        return chats;
    }

    getMessage = async (key: WAMessageKey): Promise<WAMessageContent | undefined> => {
        if (this.store && key.remoteJid && key.id) {
            const msg = await this.store.loadMessage(key.remoteJid, key.id);
            return msg?.message || undefined;
        }
        return proto.Message.fromObject({});
    }

    getInstance = (): any => this.vendor;

    /**
     * Initialize Baileys
     */
    initBailey = async (): Promise<any> => {
        const logger: Logger = pino({ level: this.globalVendorArgs.debug ? 'debug' : 'fatal' });
        const { state, saveCreds } = await useMySQLAuthState({
            session: "session1", 
            password: '$Carlos1030', 
            database: 'baileys', 
        })
        const { version, isLatest } = await fetchLatestBaileysVersion();

        if (this.globalVendorArgs.debug) console.log(`using WA v${version.join('.')}, isLatest: ${isLatest}`);

        this.store = makeInMemoryStore({ logger });
        this.store.readFromFile(`${this.NAME_DIR_SESSION}/baileys_store.json`);

        // Periodically save store
        setInterval(() => {
            const path = `${this.NAME_DIR_SESSION}/baileys_store.json`;
            if (existsSync(path)) {
                this.store?.writeToFile(path);
            }
        }, 10_000);

        try {
            await this.setUpBaileySock({ version, logger, state, saveCreds });
            return { key: this.globalVendorArgs.name };
        } catch (e) {
            this.emit('auth_failure', e);
            throw e;
        }
    }

    /**
     * Set up the Baileys socket
     */
    setUpBaileySock = async ({ version, logger, state, saveCreds }: any) => {
        this.sock = makeWASocket({
            version,
            logger,
            printQRInTerminal: false, // We'll handle QR separately
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger),
            },
            browser: ['Vende mas', 'Chrome', '1.0.0'],
            msgRetryCounterCache,
            generateHighQualityLinkPreview: true,
            getMessage: this.getMessage,
        });

        this.store?.bind(this.sock.ev);

        // Handle connection updates
        this.sock.ev.on('connection.update', this.handleConnectionUpdate);

        // Save credentials
        this.sock.ev.on('creds.update', saveCreds);

        // Listen for messages
        this.initBusEvents(this.sock);
    }

    /**
     * Handle connection updates (QR code, connected, etc.)
     */
    handleConnectionUpdate = async (update: any): Promise<void> => {
        const { connection, lastDisconnect, qr } = update;
        const statusCode = lastDisconnect?.error?.output?.statusCode;

        // Handle disconnections
        if (connection === 'close') {
            if (statusCode !== DisconnectReason.loggedOut) this.initBailey();
            if (statusCode === DisconnectReason.loggedOut) this.clearSessionAndRestart();
        }

        // We're connected
        if (connection === 'open') {
            this.vendor = this.sock;
            this.qr = null; // Clear QR code
            this.emit('ready', true);
        }

        // We got a QR code
        if (qr) {
            this.qr = qr;
            this.emit('qr', qr);

            // Generate QR code image
            try {
                const qrPath = path.join(this.NAME_DIR_SESSION, 'qr.png');
                await QRCode.toFile(qrPath, qr);
                this.emit('qr_path', qrPath);
            } catch (error) {
                console.error('Failed to save QR code:', error);
            }
        }
    }

    /**
     * Clear session and restart
     */
    clearSessionAndRestart = (): void => {
        rmSync(this.NAME_DIR_SESSION, { recursive: true, force: true });
        this.initBailey();
    }

    /**
     * Initialize event listeners for messages
     */
    busEvents = (): any[] => [
        {
            event: 'messages.upsert',
            func: async ({ messages, type }: any) => {
                // Ignore notify messages
                if (type !== 'notify') return;

                const [messageCtx] = messages;
                let payload = {
                    ...messageCtx,
                    body: messageCtx?.message?.extendedTextMessage?.text ?? messageCtx?.message?.conversation,
                    from: messageCtx?.key?.remoteJid,
                    type: 'text'
                };

                // Ignore messages that shouldn't be processed
                if (messageCtx.message?.pollUpdateMessage) return;
                if (payload.from === 'status@broadcast') return;
                if (payload?.key?.fromMe) return;

                // Format the message payload based on type
                if (messageCtx.message?.imageMessage) {
                    payload = { ...payload, type: 'image' };
                } else if (messageCtx.message?.documentMessage) {
                    payload = { ...payload, type: 'file' };
                } else if (messageCtx.message?.audioMessage) {
                    payload = { ...payload, type: 'voice' };
                } else if (messageCtx.message?.videoMessage) {
                    payload = { ...payload, type: 'video' };
                }

                // Process button responses
                const btnCtx = payload?.message?.buttonsResponseMessage?.selectedDisplayText;
                if (btnCtx) payload.body = btnCtx;

                // Emit the message event
                this.emit('message', payload);
            },
        }
    ]


    /**
     * Initialize message event listeners
     */
    initBusEvents = (_sock: any): void => {
        this.vendor = _sock;
        const listEvents = this.busEvents();

        for (const { event, func } of listEvents) {
            this.vendor.ev.on(event, func);
        }
    }

    /**
     * Get QR code 
     */
    getQR = (): string | null => {
        return this.qr;
    }

    /**
     * Generate QR code image and return the path
     */
    getQRImage = async (): Promise<string | null> => {
        if (!this.qr) {
            return null;
        }

        try {
            const qrPath = path.join(this.NAME_DIR_SESSION, 'qr.png');
            await QRCode.toFile(qrPath, this.qr);
            return qrPath;
        } catch (error) {
            console.error('Failed to generate QR code image:', error);
            return null;
        }
    }

    /**
     * Check if the instance is connected
     */
    isConnected = (): boolean => {
        return !!this.vendor;
    }

    /**
     * Send text message
     */
    sendText = async (number: string, message: string): Promise<any> => {
        const numberClean = this.formatPhone(number);
        return this.vendor.sendMessage(numberClean, { text: message });
    }

    /**
     * Send media message
     */

    sendMedia = async (number: string, mediaPath: string, text: string = ''): Promise<any> => {
        try {
            // Download media if it's a URL
            if (mediaPath.startsWith('http')) {
                // Implement download logic
                // const fileDownloaded = await downloadFile(mediaPath);
                // mediaPath = fileDownloaded;
            }

            // Check if file exists
            if (!fs.existsSync(mediaPath)) {
                throw new Error(`File not found: ${mediaPath}`);
            }

            // Try to get mime type using extension first
            let mimeType = mime.lookup(mediaPath);

            // If mime type couldn't be determined by extension, detect it from file content
            if (!mimeType) {
                const fileType = await fileTypeFromFile(mediaPath);
                if (fileType) {
                    mimeType = fileType.mime;
                }
            }

            console.log(`Detected MIME type: ${mimeType} for file: ${mediaPath}`);

            if (!mimeType) {
                // If still can't determine, default to application/octet-stream
                mimeType = 'application/octet-stream';
            }

            if (mimeType.includes('image')) {
                return this.sendImage(number, mediaPath, text);
            }
            if (mimeType.includes('video')) {
                return this.sendVideo(number, mediaPath, text);
            }
            if (mimeType.includes('audio')) {
                return this.sendAudio(number, mediaPath);
            }

            // Default to sending as a file
            return this.sendFile(number, mediaPath);
        } catch (error) {
            console.error(`Error sending media: ${error}`);
            throw error;
        }
    }

    /**
     * Send image
     */
    sendImage = async (number: string, filePath: string, text: string = ''): Promise<any> => {
        const numberClean = this.formatPhone(number);
        return this.vendor.sendMessage(numberClean, {
            image: readFileSync(filePath),
            caption: text,
        });
    }

    /**
     * Send video
     */
    sendVideo = async (number: string, filePath: string, text: string = ''): Promise<any> => {
        const numberClean = this.formatPhone(number);
        return this.vendor.sendMessage(numberClean, {
            video: readFileSync(filePath),
            caption: text,
            gifPlayback: this.globalVendorArgs.gifPlayback,
        });
    }

    /**
     * Send audio
     */
    sendAudio = async (number: string, audioUrl: string): Promise<any> => {
        const numberClean = this.formatPhone(number);
        return this.vendor.sendMessage(numberClean, {
            audio: { url: audioUrl },
            ptt: true,
        });
    }

    /**
     * Send file
     */
    sendFile = async (number: string, filePath: string): Promise<any> => {
        const numberClean = this.formatPhone(number);
        const mimeType = mime.lookup(filePath);
        const fileName = filePath.split('/').pop();
        return this.vendor.sendMessage(numberClean, {
            document: { url: filePath },
            mimetype: mimeType,
            fileName: fileName,
        });
    }

    /**
     * Format phone number
     */
    formatPhone = (phone: string): string => {
        // Remove any non-numeric characters
        let formatted = phone.replace(/\D/g, '');

        // Check if the number has a country code
        if (formatted.length > 10) {
            // Make sure it starts with the correct format for WhatsApp
            if (!formatted.endsWith('@s.whatsapp.net')) {
                formatted = `${formatted}@s.whatsapp.net`;
            }
        } else {
            // Add default country code (you might want to make this configurable)
            formatted = `52${formatted}@s.whatsapp.net`;
        }

        return formatted;
    }
}
