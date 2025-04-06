import {mysqlConfig} from '../../config/database';
import {sessionManager} from './SessionManager';
import logger from '../../utils/logger';
import mysql from 'mysql2/promise';

export type Session = {
    sessionId: string;
    userId: string;
}

export class SessionRestoreService {

    public static readonly instance: SessionRestoreService;

    protected constructor() {
    }

    public static getInstance(): SessionRestoreService {
        if (SessionRestoreService.instance) {
            return SessionRestoreService.instance;
        }
        return new SessionRestoreService();
    }

    public async restoreAllSessions(): Promise<void> {
        try {
            const sessions = await this.getStoredSessionIds();
            logger.info({count: sessions.length}, 'Found stored sessions');

            for (const session of sessions) {
                try {
                    const {sessionId, userId} = session;
                    logger.info({sessionId, userId}, 'Restoring session');
                    await sessionManager.startSession(userId, sessionId);
                } catch (error) {
                    logger.error({error, sessionId: session.sessionId}, 'Failed to restore session');
                }
            }
        } catch (error) {
            logger.error({error}, 'Failed to restore sessions');
        }
    }

    private async getStoredSessionIds(): Promise<Session[]> {
        try {
            const connection = await mysql.createConnection({
                host: mysqlConfig.host,
                port: mysqlConfig.port,
                user: mysqlConfig.user,
                password: mysqlConfig.password,
                database: mysqlConfig.database
            });

            const [rows] = await connection.execute(
                `SELECT DISTINCT session as sessionId
                 FROM ${mysqlConfig.tableName}`
            );

            await connection.end();

            return (rows as any[]).map(row => ({
                sessionId: row.sessionId,
                userId: 'restored-user'
            }));
        } catch (error) {
            logger.error({error}, 'Failed to query stored sessions');
            return [];
        }
    }
}

// Export singleton instance
export const sessionRestoreService = SessionRestoreService.getInstance();