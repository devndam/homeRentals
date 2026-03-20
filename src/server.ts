import 'reflect-metadata';
import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import { AppDataSource } from './config/data-source';
import { connectRedis } from './config/redis';
import { env } from './config/env';
import app from './app';
import { RentReminderService } from './modules/invoices/rent-reminder.service';

// Ensure uploads directory exists
fs.mkdirSync(path.join(process.cwd(), 'uploads'), { recursive: true });

async function bootstrap() {
  try {
    // Connect to PostgreSQL
    await AppDataSource.initialize();
    console.log('[Database] PostgreSQL connected');

    // Connect to Redis (non-blocking — app works without it)
    await connectRedis();

    // Daily rent reminder cron job at 8:00 AM
    cron.schedule('0 8 * * *', async () => {
      console.log('[Cron] Running daily rent reminders...');
      try {
        const reminderService = new RentReminderService();
        const result = await reminderService.processReminders();
        console.log(`[Cron] Rent reminders done. ${result.sent} email(s) sent.`);
      } catch (err) {
        console.error('[Cron] Rent reminder error:', err);
      }
    });
    console.log('[Cron] Rent reminder job scheduled (daily at 8:00 AM)');

    // Start server
    app.listen(env.port, () => {
      console.log(`[Server] Running on port ${env.port}`);
      console.log(`[Server] API prefix: ${env.apiPrefix}`);
      console.log(`[Server] Environment: ${env.nodeEnv}`);
    });
  } catch (err) {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Server] SIGTERM received, shutting down...');
  await AppDataSource.destroy();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Server] SIGINT received, shutting down...');
  await AppDataSource.destroy();
  process.exit(0);
});

bootstrap();
