import 'reflect-metadata';
import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import { AppDataSource } from './config/data-source';
import { connectRedis } from './config/redis';
import { env } from './config/env';
import app from './app';
import { RentReminderService } from './modules/invoices/rent-reminder.service';
import { InvoiceService } from './modules/invoices/invoice.service';
import { BookingService } from './modules/bookings/booking.service';

// Ensure uploads directory exists
fs.mkdirSync(path.join(process.cwd(), 'uploads'), { recursive: true });

async function bootstrap() {
  try {
    // Connect to PostgreSQL
    await AppDataSource.initialize();
    console.log('[Database] PostgreSQL connected');

    // Connect to Redis (non-blocking — app works without it)
    await connectRedis();

    // Daily rent jobs cron at 8:00 AM
    cron.schedule('0 8 * * *', async () => {
      console.log('[Cron] Running daily rent jobs...');
      try {
        // Step 1: Generate renewal invoices for expired rentals
        const invoiceService = new InvoiceService();
        const renewalResult = await invoiceService.generateRenewalInvoices();
        console.log(`[Cron] Renewal invoices: ${renewalResult.created} created.`);

        // Step 2: Send rent reminders (runs after renewals so expired parents don't trigger overdue emails)
        const reminderService = new RentReminderService();
        const reminderResult = await reminderService.processReminders();
        console.log(`[Cron] Rent reminders: ${reminderResult.sent} email(s) sent.`);

        // Step 3: Auto-cancel stale bookings (inspection date passed 3+ days ago)
        const bookingService = new BookingService();
        const cleanupResult = await bookingService.cleanupStaleBookings();
        console.log(`[Cron] Stale bookings cancelled: ${cleanupResult.cancelled}`);
      } catch (err) {
        console.error('[Cron] Daily rent job error:', err);
      }
    });
    console.log('[Cron] Daily rent job scheduled (8:00 AM)');

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
