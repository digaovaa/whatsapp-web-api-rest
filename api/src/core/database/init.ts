import mysql from 'mysql2/promise';
import { mysqlConfig } from '../../config/env';
import logger from '../../utils/logger';
import { useMySQLAuthState } from 'mysql-baileys';

export async function initializeDatabase(): Promise<void> {
    // Ensure application tables
    let connection: mysql.Connection | null = null;
    try {
        connection = await mysql.createConnection({
            host: mysqlConfig.MYSQL_HOST,
            port: mysqlConfig.MYSQL_PORT,
            user: mysqlConfig.MYSQL_USER,
            password: mysqlConfig.MYSQL_PASSWORD,
            database: mysqlConfig.MYSQL_DATABASE
        });

        // Tabela company
        const companyTableSQL = `
            CREATE TABLE IF NOT EXISTS company (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                name TEXT NOT NULL,
                token TEXT NOT NULL,
                connectionsLimit INT DEFAULT 10,
                connectionsInstance INT DEFAULT 200,
                dateLimit TIMESTAMP NULL DEFAULT NULL,
                redisUri TEXT NULL DEFAULT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `;
        await connection.execute(companyTableSQL);
        // Cria índice em company.token se não existir (MySQL não suporta IF NOT EXISTS em CREATE INDEX)
        const [companyIdx] = await connection.execute<any[]>(
            `SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'company' AND INDEX_NAME = 'idx_company_token'`,
            [mysqlConfig.MYSQL_DATABASE]
        );
        if (!Array.isArray(companyIdx) || companyIdx.length === 0) {
            await connection.execute(`CREATE INDEX idx_company_token ON company (token(255))`);
        }
        logger.info('Tabela company verificada/criada com sucesso');

        // Tabela users (modelo compatível com Go)
        const usersTableSQL = `
            CREATE TABLE IF NOT EXISTS users (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                name TEXT NOT NULL,
                token TEXT NOT NULL,
                webhook TEXT NULL DEFAULT NULL,
                jid TEXT NULL DEFAULT NULL,
                qrcode TEXT NULL DEFAULT NULL,
                connected INT DEFAULT 0,
                expiration INT DEFAULT 0,
                events VARCHAR(32) NOT NULL DEFAULT 'All',
                pairingCode TEXT NULL DEFAULT NULL,
                instance TEXT NULL DEFAULT NULL,
                countTextMsg INT DEFAULT 0,
                countImageMsg INT DEFAULT 0,
                countVoiceMsg INT DEFAULT 0,
                countVideoMsg INT DEFAULT 0,
                countStickerMsg INT DEFAULT 0,
                countLocationMsg INT DEFAULT 0,
                countContactMsg INT DEFAULT 0,
                countDocumentMsg INT DEFAULT 0,
                companyId INT NULL,
                whatsappId INT NULL,
                multiCompanyId INT NULL,
                importOldMessages TEXT NULL DEFAULT NULL,
                importRecentMessages TEXT NULL DEFAULT NULL,
                importOldMessagesGroup BOOLEAN DEFAULT FALSE,
                acceptAudios BOOLEAN DEFAULT TRUE,
                acceptVideos BOOLEAN DEFAULT TRUE,
                acceptImages BOOLEAN DEFAULT TRUE,
                acceptDocuments BOOLEAN DEFAULT TRUE,
                acceptContacts BOOLEAN DEFAULT TRUE,
                acceptLocations BOOLEAN DEFAULT TRUE,
                acceptSticker BOOLEAN DEFAULT TRUE,
                logged INT DEFAULT 0,
                bucketName TEXT NULL DEFAULT NULL,
                reasonDisconnect TEXT NULL DEFAULT NULL,
                INDEX idx_user_token (token(255)),
                INDEX idx_companyId (companyId),
                CONSTRAINT fk_user_company FOREIGN KEY (companyId) REFERENCES company(id) ON UPDATE CASCADE ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `;
        await connection.execute(usersTableSQL);
        logger.info('Tabela users verificada/criada com sucesso');

        // Tabela messages
        const messagesTableSQL = `
            CREATE TABLE IF NOT EXISTS messages (
                messageID VARCHAR(255) NOT NULL,
                message MEDIUMTEXT NOT NULL,
                ` + '`key`' + ` MEDIUMTEXT NOT NULL,
                createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                sessionId VARCHAR(255) NOT NULL,
                PRIMARY KEY (sessionId, messageID),
                INDEX idx_messages_createdAt (createdAt),
                INDEX idx_messages_sessionId (sessionId)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `;
        await connection.execute(messagesTableSQL);
        logger.info('Tabela messages verificada/criada com sucesso');
    } catch (error) {
        logger.error({ error }, 'Falha ao criar/verificar tabela users');
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }

    // Ensure mysql-baileys tables by probing auth state (lets the lib create its schema)
    try {
        const { removeCreds } = await useMySQLAuthState({
            session: '__schema_probe__',
            host: mysqlConfig.MYSQL_HOST,
            port: mysqlConfig.MYSQL_PORT,
            user: mysqlConfig.MYSQL_USER,
            password: mysqlConfig.MYSQL_PASSWORD,
            database: mysqlConfig.MYSQL_DATABASE,
            tableName: mysqlConfig.MYSQL_TABLE
        });

        // Cleanup any probe data for the probe session
        await removeCreds();
        logger.info({ table: mysqlConfig.MYSQL_TABLE }, 'Tabelas de auth (mysql-baileys) verificadas/criadas');
    } catch (error) {
        // Não interrompe o start da app; apenas alerta
        logger.warn({ error }, 'Não foi possível verificar/criar tabelas do mysql-baileys automaticamente');
    }
}


