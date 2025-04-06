import {z} from "zod";

const mysqlEnvSchema = z.object({
    host: z.string().default("localhost"),
    port: z.number().default(3306),
    user: z.string().default("root"),
    password: z.string().default("$Carlos1030"),
    database: z.string().default("baileys"),
    tableName: z.string().default("auth"),
    ssl: z.coerce.boolean().default(false),
    allowPublicKeyRetrieval: z.coerce.boolean().default(false),
})

export const mysqlConfig = mysqlEnvSchema.parse(process.env);

export const webhookUrl = process.env.WEBHOOK_URL || "http://localhost:3001/api/webhook/message";