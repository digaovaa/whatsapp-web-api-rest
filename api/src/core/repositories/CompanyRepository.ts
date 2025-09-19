import mysql, { RowDataPacket } from 'mysql2/promise';
import { mysqlConfig } from '../../config/env';

export interface CompanyRow extends RowDataPacket {
  id: number;
  name: string;
  token: string;
}

class CompanyRepository {
  async getByToken(token: string): Promise<CompanyRow | null> {
    const conn = await mysql.createConnection({
      host: mysqlConfig.MYSQL_HOST,
      port: mysqlConfig.MYSQL_PORT,
      user: mysqlConfig.MYSQL_USER,
      password: mysqlConfig.MYSQL_PASSWORD,
      database: mysqlConfig.MYSQL_DATABASE
    });
    const [rows] = await conn.execute<CompanyRow[]>(
      `SELECT id, name, token FROM company WHERE token = ? LIMIT 1`,
      [token]
    );
    await conn.end();
    return rows[0] || null;
  }
}

export const companyRepository = new CompanyRepository();


