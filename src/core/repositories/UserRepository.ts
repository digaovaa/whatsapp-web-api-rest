import { mysqlConfig } from "../../config/database";
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
                host: mysqlConfig.host,
                port: mysqlConfig.port,
                user: mysqlConfig.user,
                password: mysqlConfig.password,
                database: mysqlConfig.database
            });


            await connection.execute(
                `INSERT INTO ${mysqlConfig.userTableName} (sessionId, userId) VALUES (?, ?)`,
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
                host: mysqlConfig.host,
                port: mysqlConfig.port,
                user: mysqlConfig.user,
                password: mysqlConfig.password,
                database: mysqlConfig.database
            });


            const [rows] = await connection.execute<UserRow[]>(
                `SELECT * FROM ${mysqlConfig.userTableName} WHERE sessionId = ? LIMIT 1`,
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