import {
    Browsers,
    DisconnectReason,
    isJidBroadcast,
    isJidGroup,
    isJidNewsletter,
    makeCacheableSignalKeyStore,
    makeWASocket,
    WAMessageContent,
    WAMessageKey,
    WASocket
} from '@whiskeysockets/baileys';
import {useMySQLAuthState} from 'mysql-baileys';
import {mysqlConfig} from '../../config/database';
import {EventEmitter} from '../events/EventEmitter';
import {SessionStatus} from '../types';
import logger from '../../utils/logger';
import {MessageProcessor} from './MessageProcessor';
import qrcode from 'qrcode';

/**
 * Factory class for creating WhatsApp sessions
 */
export class SessionFactory {
    /**
     * Create a new WhatsApp session
     * @param sessionId Unique session identifier
     * @param onQRCallback Callback for QR code updates
     * @returns WASocket instance
     */
    public async createSession(
        sessionId: string,
        onQRCallback: (qrCode: string) => void
    ): Promise<WASocket> {
        try {
            // Initialize MySQL auth state
            const {state, saveCreds, removeCreds} = await useMySQLAuthState({
                session: sessionId,
                host: mysqlConfig.host,
                port: mysqlConfig.port,
                user: mysqlConfig.user,
                password: mysqlConfig.password,
                database: mysqlConfig.database,
                tableName: mysqlConfig.tableName
            });

            this.removeSessionFunctions.set(sessionId, removeCreds);
            const socket = makeWASocket({
                printQRInTerminal: false,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, logger),
                },
                browser: Browsers.macOS('Chrome'),
                logger,
                markOnlineOnConnect: false,
                generateHighQualityLinkPreview: false,
                syncFullHistory: false,
                connectTimeoutMs: 60000,
                retryRequestDelayMs: 500,
                transactionOpts: {maxCommitRetries: 10, delayBetweenTriesMs: 1000},
                getMessage: async (msg: WAMessageKey): Promise<WAMessageContent | undefined> => {
                    //TODO: Retrieve messages from some database, the messages has to be saved on "messages.upsert" event
                    return {conversation: 'hello'};
                },
                shouldIgnoreJid: (jid) => {
                    const isGroupJid = isJidGroup(jid);
                    const isBroadcast = isJidBroadcast(jid);
                    const isNewsletter = isJidNewsletter(jid);
                    return isGroupJid || isBroadcast || isNewsletter;
                }
            });

            this.connectionState.set(sessionId, {
                isReconnecting: false,
                lastDisconnect: null,
                qrGenerated: false,
                pairingStarted: false
            });

            socket.ev.on('connection.update', async (update) => {
                const {connection, lastDisconnect, qr, isNewLogin, receivedPendingNotifications} = update;
                const state = this.connectionState.get(sessionId);

                if (!state) return;

                if (qr && !state.pairingStarted) {
                    state.qrGenerated = true;
                    try {
                        const qrCode = await qrcode.toDataURL(qr);
                        onQRCallback(qrCode);
                    } catch (error) {
                        logger.error({sessionId, error}, 'Failed to generate QR code');
                    }
                }

                // Handle connection state changes
                if (connection === 'open') {
                    // Connection established successfully
                    state.pairingStarted = false;
                    state.isReconnecting = false;

                    logger.info({sessionId}, 'Connection established successfully');

                    if (isNewLogin) {
                        logger.info({sessionId}, 'New login detected');
                    }

                    if (receivedPendingNotifications) {
                        logger.info({sessionId}, 'Received pending notifications');
                    }

                    EventEmitter.emitSessionUpdate({
                        sessionId,
                        status: SessionStatus.CONNECTED
                    });
                }

                if (connection === 'connecting' && !state.isReconnecting) {
                    EventEmitter.emitSessionUpdate({
                        sessionId,
                        status: SessionStatus.CONNECTING
                    });
                }

                if (connection === 'close') {
                    // Handle connection close
                    const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
                    const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                    state.lastDisconnect = lastDisconnect;

                    logger.info({
                        sessionId,
                        statusCode,
                        shouldReconnect,
                        errorMessage: (lastDisconnect?.error as any)?.message
                    }, 'Connection closed');

                    // Handle the stream error (515)
                    if (statusCode === 515) {
                        logger.info({sessionId}, 'Stream error 515 detected, handling reconnection');

                        // Only attempt to reconnect if we're not already trying to reconnect
                        if (!state.isReconnecting) {
                            state.isReconnecting = true;

                            EventEmitter.emitSessionUpdate({
                                sessionId,
                                status: SessionStatus.CONNECTING,
                                data: {message: 'Reconnecting after stream error'}
                            });

                            // Wait before attempting reconnection
                            setTimeout(async () => {
                                try {
                                    // We'll create a new socket with the same session
                                    logger.info({sessionId}, 'Attempting to reconnect after stream error');

                                    // Remove existing socket listeners to prevent memory leaks
                                    socket.ev.removeAllListeners('connection.update');

                                    // Create a new socket (we don't remove the session data)
                                    const newSocket = await this.createSession(sessionId, onQRCallback);

                                    // Replace the old socket with the new one
                                    Object.assign(socket, newSocket);

                                    state.isReconnecting = false;
                                } catch (err) {
                                    logger.error({sessionId, err}, 'Failed to reconnect after stream error');
                                    state.isReconnecting = false;

                                    EventEmitter.emitSessionUpdate({
                                        sessionId,
                                        status: SessionStatus.FAILED,
                                        data: {message: 'Failed to reconnect after stream error'}
                                    });
                                }
                            }, 5000); // Wait 5 seconds before reconnecting
                        }
                    } else if (shouldReconnect) {
                        // For other reconnectable errors
                        EventEmitter.emitSessionUpdate({
                            sessionId,
                            status: SessionStatus.DISCONNECTED,
                            data: {statusCode}
                        });
                    } else {
                        // Permanent disconnection (like logged out)
                        void this.removeSession(sessionId);
                        EventEmitter.emitSessionUpdate({
                            sessionId,
                            status: SessionStatus.FAILED,
                            data: {statusCode, message: 'Logged out or permanent error'}
                        });
                    }
                }
            });

            // Custom listener for pairing success messages
            const originalLogger = socket.logger;
            if (originalLogger) {
                // Wrap the existing logger to intercept pairing messages
                socket.logger = {
                    ...originalLogger,
                    info: (data: any, message: string, ...args: any[]) => {
                        const state = this.connectionState.get(sessionId);

                        // Intercept the pairing message
                        if (message && message.includes('pairing configured successfully')) {
                            logger.info({sessionId}, 'Pairing successful, preparing for connection restart');

                            if (state) {
                                state.pairingStarted = true;
                            }

                            EventEmitter.emitSessionUpdate({
                                sessionId,
                                status: SessionStatus.CONNECTING,
                                data: {message: 'Pairing successful, connection restarting'}
                            });
                        }

                        // Call the original logger
                        return originalLogger.info(data, message);
                    }
                };
            }

            // Save credentials on update
            socket.ev.on('creds.update', saveCreds);

            // Handle incoming messages
            socket.ev.on('messages.upsert', async ({messages, type}) => {
                // Only process new messages
                if (type !== 'notify') return;

                for (const message of messages) {
                    // Process the message
                    const processedMessage = await MessageProcessor.processMessage(socket, message, sessionId);

                    if (processedMessage) {
                        logger.debug({
                            sessionId,
                            messageId: message.key?.id,
                            from: processedMessage.from,
                            type: processedMessage.messageType
                        }, 'Received new message');

                        // Emit the message event
                        EventEmitter.emitMessage(processedMessage);
                    }
                }
            });

            // Handle message status updates
            socket.ev.on('messages.update', (updates) => {
                for (const update of updates) {
                    if (update.key && typeof update.update?.status === 'number') {
                        const ack = MessageProcessor.processMessageAck(
                            update.key,
                            update.update.status,
                            sessionId
                        );

                        logger.debug({
                            sessionId,
                            messageId: update.key.id,
                            status: ack.statusDescription
                        }, 'Message status update');

                        // Emit the message ack event
                        EventEmitter.emitMessageAck(ack);
                    }
                }
            });

            return socket;
        } catch (error) {
            logger.error({sessionId, error}, 'Failed to create session');
            throw error;
        }
    }

    // Store session removal functions for cleanup
    private removeSessionFunctions = new Map<string, () => Promise<void>>();

    // Track connection state for each session
    private connectionState = new Map<string, {
        isReconnecting: boolean;
        lastDisconnect: any;
        qrGenerated: boolean;
        pairingStarted: boolean;
    }>();

    /**
     * Remove a session from storage
     * @param sessionId Session identifier to remove
     */
    public async removeSession(sessionId: string): Promise<void> {
        try {
            const removeCreds = this.removeSessionFunctions.get(sessionId);
            if (removeCreds) {
                await removeCreds();
                this.removeSessionFunctions.delete(sessionId);
            }

            // Remove connection state
            this.connectionState.delete(sessionId);
        } catch (error) {
            logger.error({sessionId, error}, 'Failed to remove session');
            throw error;
        }
    }
}
