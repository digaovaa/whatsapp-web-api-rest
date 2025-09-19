import mysql from 'mysql2/promise';
import { mysqlConfig } from '../../config/env';
import logger from '../../utils/logger';
import { WAMessageContent } from 'baileys';

class MessagesRepository {
  async get(messageID: string, sessionId: string): Promise<WAMessageContent> {
    logger.info({ messageID, sessionId }, 'Getting message');
    const conn = await mysql.createConnection({
      host: mysqlConfig.MYSQL_HOST,
      port: mysqlConfig.MYSQL_PORT,
      user: mysqlConfig.MYSQL_USER,
      password: mysqlConfig.MYSQL_PASSWORD,
      database: mysqlConfig.MYSQL_DATABASE
    });
    const [result]: any = await conn.execute(`SELECT message FROM messages WHERE messageID = ? AND sessionId = ?`, [messageID, sessionId]);
    await conn.end();
    return result[0].message as WAMessageContent;
  }

  async insert(messageID: string, message: string, sessionId: string, key: string): Promise<void> {
    logger.info({ messageID, sessionId }, 'Inserting message');
    const conn = await mysql.createConnection({
      host: mysqlConfig.MYSQL_HOST,
      port: mysqlConfig.MYSQL_PORT,
      user: mysqlConfig.MYSQL_USER,
      password: mysqlConfig.MYSQL_PASSWORD,
      database: mysqlConfig.MYSQL_DATABASE
    });
    await conn.execute(
      `INSERT INTO messages (messageID, message, sessionId, \`key\`) VALUES (?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE message = VALUES(message), \`key\` = VALUES(\`key\`)`,
      [messageID, message, sessionId, key]
    );
    await conn.end();
  }

  async deleteOlderThan(days: number): Promise<number> {
    const conn = await mysql.createConnection({
      host: mysqlConfig.MYSQL_HOST,
      port: mysqlConfig.MYSQL_PORT,
      user: mysqlConfig.MYSQL_USER,
      password: mysqlConfig.MYSQL_PASSWORD,
      database: mysqlConfig.MYSQL_DATABASE
    });
    const [result]: any = await conn.execute(
      `DELETE FROM messages WHERE createdAt < (NOW() - INTERVAL ? DAY)`,
      [days]
    );
    await conn.end();
    return result.affectedRows || 0;
  }
}

export const messagesRepository = new MessagesRepository();


