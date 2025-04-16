import { mysqlConfig } from '../../config/env';
import { sessionManager } from './SessionManager';
import logger from '../../utils/logger';
import mysql, { RowDataPacket } from 'mysql2/promise';
import { userRepository } from '../repositories/UserRepository';

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
            logger.info({ count: sessions.length }, 'Found stored sessions');

            for (const session of sessions) {
                try {
                    const { sessionId, userId } = session;
                    logger.info({ sessionId, userId }, 'Restoring session');
                    await sessionManager.startSession(userId, sessionId);
                } catch (error) {
                    logger.error({ error, sessionId: session.sessionId }, 'Failed to restore session');
                }
            }
        } catch (error) {
            logger.error({ error }, 'Failed to restore sessions');
        }
    }

    private async getStoredSessionIds(): Promise<Session[]> {
        try {
            const connection = await mysql.createConnection({
                host: mysqlConfig.MYSQL_HOST,
                port: mysqlConfig.MYSQL_PORT,
                user: mysqlConfig.MYSQL_USER,
                password: mysqlConfig.MYSQL_PASSWORD,
                database: mysqlConfig.MYSQL_DATABASE
            });

            const [rows] = await connection.execute<RowDataPacket[]>('SELECT DISTINCT session as sessionId FROM auth');

            await connection.end();

            const result: Session[] = []

            if (rows.length === 0) {
                logger.info('No stored sessions found');
                return result;
            }

            for (const row of rows) {
                const userId = await userRepository.findBySessionId(row.sessionId);

                if (!userId) {
                    logger.warn({ sessionId: row.sessionId }, 'No user found for session');
                    continue;
                }

                result.push({
                    sessionId: row.sessionId,
                    userId: userId.userId,
                });
            }

            return result;
        } catch (error) {
            logger.error({ error }, 'Failed to query stored sessions');
            return [];
        }
    }
}

// Export singleton instance
export const sessionRestoreService = SessionRestoreService.getInstance();