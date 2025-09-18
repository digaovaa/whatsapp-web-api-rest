import { mysqlConfig } from "../../config/env";
import mysql, { RowDataPacket } from 'mysql2/promise';
import logger from "../../utils/logger";

export interface UserRow extends RowDataPacket {
    sessionId: string;
    userId: string;
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
                `INSERT INTO users (sessionId, userId) VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE userId = VALUES(userId)`,
                [sessionId, userId]
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
                `SELECT * FROM users WHERE sessionId = ? LIMIT 1`,
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

}


export const userRepository = new UserRepository();