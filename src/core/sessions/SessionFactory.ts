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
} from 'baileys';
import { useMySQLAuthState } from 'mysql-baileys';
import qrcode from 'qrcode';
import { mysqlConfig } from '../../config/env';
import logger from '../../utils/logger';
import { EventEmitter } from '../events/EventEmitter';
import { userRepository } from '../repositories/UserRepository';
import { SessionInfo, SessionStatus } from '../types';
import { MessageProcessor } from './MessageProcessor';

export class SessionFactory {

    public async createSession(
        sessionInfo: SessionInfo,
        onQRCallback: (qrCode: string) => void
    ): Promise<WASocket> {
        const sessionId = sessionInfo.id

        try {
            const { state, saveCreds, removeCreds } = await useMySQLAuthState({
                session: sessionId,
                host: mysqlConfig.MYSQL_HOST,
                port: mysqlConfig.MYSQL_PORT,
                user: mysqlConfig.MYSQL_USER,
                password: mysqlConfig.MYSQL_PASSWORD,
                database: mysqlConfig.MYSQL_DATABASE,
                tableName: "auth"
            });

            this.removeSessionFunctions.set(sessionId, removeCreds);
            const socket = makeWASocket({
                printQRInTerminal: false,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, logger),
                },
                browser: Browsers.macOS("Chrome"),
                logger,
                markOnlineOnConnect: false,
                generateHighQualityLinkPreview: false,
                syncFullHistory: false,
                shouldSyncHistoryMessage: () => false,
                connectTimeoutMs: 60000,
                retryRequestDelayMs: 500,
                transactionOpts: { maxCommitRetries: 10, delayBetweenTriesMs: 1000 },
                getMessage: async (msg: WAMessageKey): Promise<WAMessageContent | undefined> => {
                    //TODO: Retrieve messages from some database, the messages has to be saved on "messages.upsert" event
                    return { conversation: 'hello' };
                },
                shouldIgnoreJid: (jid) => isJidGroup(jid) || isJidBroadcast(jid) || isJidNewsletter(jid)
            });

            this.connectionState.set(sessionId, {
                isReconnecting: false,
                lastDisconnect: null,
                qrGenerated: false,
                pairingStarted: false
            });

            socket.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr, isNewLogin, receivedPendingNotifications } = update;
                const state = this.connectionState.get(sessionId);

                if (!state) return;

                if (qr && !state.pairingStarted) {
                    state.qrGenerated = true;
                    try {
                        const qrCode = await qrcode.toDataURL(qr);
                        onQRCallback(qrCode);
                    } catch (error) {
                        logger.error({ sessionId, error }, 'Failed to generate QR code');
                    }
                }

                if (connection === 'open') {
                    state.pairingStarted = false;
                    state.isReconnecting = false;

                    logger.info({ sessionId }, 'Connection established successfully');

                    if (isNewLogin) {
                        logger.info({ sessionId }, 'New login detected');
                    }

                    if (receivedPendingNotifications) {
                        logger.info({ sessionId }, 'Received pending notifications');
                    }

                    sessionInfo.status = SessionStatus.CONNECTED

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
                    const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
                    const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                    state.lastDisconnect = lastDisconnect;

                    sessionInfo.status = SessionStatus.DISCONNECTED;

                    logger.info({
                        sessionId,
                        statusCode,
                        shouldReconnect,
                        errorMessage: (lastDisconnect?.error as any)?.message
                    }, 'Connection closed');

                    if (statusCode === 515) {
                        logger.info({ sessionId }, 'Stream error 515 detected, handling reconnection');

                        if (!state.isReconnecting) {
                            state.isReconnecting = true;

                            EventEmitter.emitSessionUpdate({
                                sessionId,
                                status: SessionStatus.CONNECTING,
                                data: { message: 'Reconnecting after stream error' }
                            });

                            setTimeout(async () => {
                                try {
                                    logger.info({ sessionId }, 'Attempting to reconnect after stream error');

                                    socket.ev.removeAllListeners('connection.update');

                                    const newSocket = await this.createSession(sessionInfo, onQRCallback);

                                    Object.assign(socket, newSocket);

                                    state.isReconnecting = false;
                                } catch (err) {
                                    logger.error({ sessionId, err }, 'Failed to reconnect after stream error');
                                    state.isReconnecting = false;

                                    EventEmitter.emitSessionUpdate({
                                        sessionId,
                                        status: SessionStatus.FAILED,
                                        data: { message: 'Failed to reconnect after stream error' }
                                    });
                                }
                            }, 5000);
                        }
                    } else if (shouldReconnect) {
                        EventEmitter.emitSessionUpdate({
                            sessionId,
                            status: SessionStatus.DISCONNECTED,
                            data: { statusCode }
                        });
                    } else {
                        void this.removeSession(sessionId);
                        if (statusCode === DisconnectReason.loggedOut) {
                            EventEmitter.emitSessionUpdate({
                                sessionId,
                                status: SessionStatus.STOPPED,
                                data: { statusCode, message: 'Logged out' }
                            });
                        } else {
                            EventEmitter.emitSessionUpdate({
                                sessionId,
                                status: SessionStatus.FAILED,
                                data: { statusCode, message: 'Permanent error' }
                            });
                        }
                    }
                }
            });

            const originalLogger = socket.logger;
            if (originalLogger) {
                // Wrap the existing logger to intercept pairing messages
                socket.logger = {
                    ...originalLogger,
                    info: (data: any, message: string, ...args: any[]) => {
                        const state = this.connectionState.get(sessionId);

                        // Intercept the pairing message
                        if (message && message.includes('pairing configured successfully')) {
                            logger.info({ sessionId }, 'Pairing successful, preparing for connection restart');

                            if (state) {
                                state.pairingStarted = true;
                            }

                            EventEmitter.emitSessionUpdate({
                                sessionId,
                                status: SessionStatus.CONNECTING,
                                data: { message: 'Pairing successful, connection restarting' }
                            });
                        }

                        // Call the original logger
                        return originalLogger.info(data, message);
                    }
                };
            }

            socket.ev.on('creds.update', async () => {
                await userRepository.add(sessionInfo.userId, sessionId);
                saveCreds();
            });

            socket.ev.on('messages.upsert', async ({ messages, type }) => {
                if (type !== 'notify') return;

                for (const message of messages) {
                    const processedMessage = await MessageProcessor.processMessage(socket, message, sessionInfo);

                    if (processedMessage) {
                        EventEmitter.emitMessage({ ...processedMessage, userId: sessionInfo.userId });
                    }
                }
            });

            socket.ev.on('messages.update', (updates) => {
                for (const update of updates) {
                    if (update.key && typeof update.update?.status === 'number') {
                        const ack = MessageProcessor.processMessageAck(
                            update.key,
                            update.update.status,
                            sessionInfo
                        );

                        logger.debug({
                            sessionId: sessionInfo.id,
                            messageId: update.key.id,
                            status: ack.statusDescription
                        }, 'Message status update');

                        EventEmitter.emitMessageAck({ ...ack, userId: sessionInfo.userId });
                    }
                }
            });

            return socket;
        } catch (error) {
            logger.error({ sessionId, error }, 'Failed to create session');
            throw error;
        }
    }

    private removeSessionFunctions = new Map<string, () => Promise<void>>();

    private connectionState = new Map<string, {
        isReconnecting: boolean;
        lastDisconnect: any;
        qrGenerated: boolean;
        pairingStarted: boolean;
    }>();

    public async removeSession(sessionId: string): Promise<void> {
        try {
            const removeCreds = this.removeSessionFunctions.get(sessionId);
            if (removeCreds) {
                await removeCreds();
                this.removeSessionFunctions.delete(sessionId);
            }

            this.connectionState.delete(sessionId);
        } catch (error) {
            logger.error({ sessionId, error }, 'Failed to remove session');
            throw error;
        }
    }
}
