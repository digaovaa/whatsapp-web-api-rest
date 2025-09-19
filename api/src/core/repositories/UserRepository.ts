import { mysqlConfig } from "../../config/env";
import mysql, { RowDataPacket } from 'mysql2/promise';
import logger from "../../utils/logger";

export interface UserRow extends RowDataPacket {
    id: number;
    name: string;
    token: string;
    webhook: string;
    jid: string;
    qrcode: string;
    connected: number;
    expiration: number;
    events: string;
    pairingCode: string;
    instance: string;
    countTextMsg: number;
    countImageMsg: number;
    countVoiceMsg: number;
    countVideoMsg: number;
    countStickerMsg: number;
    countLocationMsg: number;
    countContactMsg: number;
    countDocumentMsg: number;
    companyId: number | null;
    whatsappId: number | null;
    multiCompanyId: number | null;
    importOldMessages: string;
    importRecentMessages: string;
    importOldMessagesGroup: number;
    acceptAudios: number;
    acceptVideos: number;
    acceptImages: number;
    acceptDocuments: number;
    acceptContacts: number;
    acceptLocations: number;
    acceptSticker: number;
    logged: number;
    bucketName: string;
    reasonDisconnect: string;
}

class UserRepository {

    async add(userId: string, sessionId: string): Promise<void> {
        try {
            const connection = await mysql.createConnection({
                host: mysqlConfig.MYSQL_HOST,
                port: mysqlConfig.MYSQL_PORT,
                user: mysqlConfig.MYSQL_USER,
                password: mysqlConfig.MYSQL_PASSWORD,
                database: mysqlConfig.MYSQL_DATABASE
            });


            await connection.execute(
                `INSERT INTO users (Name, Token) VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE Name = VALUES(Name)`,
                [userId, sessionId]
            );

            await connection.end();
        } catch (error) {
            logger.error({ error }, 'Failed to add session');
        }
    }

    async findBySessionId(sessionId: string): Promise<UserRow | null> {
        try {
            const connection = await mysql.createConnection({
                host: mysqlConfig.MYSQL_HOST,
                port: mysqlConfig.MYSQL_PORT,
                user: mysqlConfig.MYSQL_USER,
                password: mysqlConfig.MYSQL_PASSWORD,
                database: mysqlConfig.MYSQL_DATABASE
            });

            const [rows] = await connection.execute<UserRow[]>(
                `SELECT * FROM users WHERE Token = ? LIMIT 1`,
                [sessionId]
            );

            if (rows.length === 0) {
                return null;
            }

            const user = rows[0];
            await connection.end();
            return user;

        } catch (error) {
            logger.error({ error }, 'Failed to find session by ID');
            return null;
        }
    }

    async getByToken(token: string): Promise<UserRow | null> {
        const connection = await mysql.createConnection({
            host: mysqlConfig.MYSQL_HOST,
            port: mysqlConfig.MYSQL_PORT,
            user: mysqlConfig.MYSQL_USER,
            password: mysqlConfig.MYSQL_PASSWORD,
            database: mysqlConfig.MYSQL_DATABASE
        });

        const [rows] = await connection.execute<UserRow[]>(
            `SELECT * FROM users WHERE Token = ? LIMIT 1`,
            [token]
        );
        await connection.end();
        return rows[0] || null;
    }

}


export const userRepository = new UserRepository();