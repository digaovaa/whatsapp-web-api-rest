import { z } from "zod";
import { config } from "dotenv"

config()

const mysqlEnvSchema = z.object({
    MYSQL_HOST: z.string(),
    MYSQL_PORT: z.coerce.number().default(3306),
    MYSQL_USER: z.string(),
    MYSQL_PASSWORD: z.string(),
    MYSQL_DATABASE: z.string(),
    MYSQL_TABLE: z.string()
})

export const mysqlConfig = mysqlEnvSchema.parse(process.env);

export const webhookUrl = process.env.WEBHOOK_URL || "http://localhost:3001/api/webhook/message";
export const logLevel = process.env.LOG_LEVEL || "info";
export const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
export const NODE_ENV = process.env.NODE_ENV || "development";

const rabbitEnvSchema = z.object({
    AMQP_URI: z.string().default('amqp://localhost'),
    AMQP_EXCHANGE: z.string().default('whatsapp.events'),
})

export const rabbitConfig = rabbitEnvSchema.parse(process.env);