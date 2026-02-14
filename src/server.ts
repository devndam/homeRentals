import 'reflect-metadata';
import { AppDataSource } from './config/data-source';
import { connectRedis } from './config/redis';
import { env } from './config/env';
import app from './app';

async function bootstrap() {
  try {
    // Connect to PostgreSQL
    await AppDataSource.initialize();
    console.log('[Database] PostgreSQL connected');

    // Connect to Redis (non-blocking — app works without it)
    await connectRedis();

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
