import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT ?? 3000),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  dbPath: process.env.DB_PATH ?? './data/devices.db',
  publicWebhookBaseUrl: process.env.PUBLIC_WEBHOOK_BASE_URL ?? '',
};
