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

        const usersTableSQL = `
            CREATE TABLE IF NOT EXISTS users (
                sessionId VARCHAR(255) NOT NULL,
                userId VARCHAR(255) NOT NULL,
                companyId INT NULL,
                PRIMARY KEY (sessionId),
                INDEX idx_userId (userId),
                INDEX idx_companyId (companyId)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `;

        await connection.execute(usersTableSQL);
        logger.info('Tabela users verificada/criada com sucesso');

        // Garante coluna companyId se a tabela já existia sem ela
        const [cols] = await connection.execute<any[]>(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'companyId'`,
            [mysqlConfig.MYSQL_DATABASE]
        );
        if (!Array.isArray(cols) || cols.length === 0) {
            await connection.execute(`ALTER TABLE users ADD COLUMN companyId INT NULL AFTER userId`);
            await connection.execute(`CREATE INDEX idx_companyId ON users (companyId)`);
            logger.info('Coluna companyId adicionada à tabela users');
        }
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


