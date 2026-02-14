import Redis from 'ioredis';
import { env } from './env';

let redis: Redis | null = null;

export function isRedisEnabled(): boolean {
  return env.redis.enabled;
}

export function getRedis(): Redis | null {
  if (!isRedisEnabled()) return null;

  if (!redis) {
    redis = new Redis({
      host: env.redis.host,
      port: env.redis.port,
      password: env.redis.password,
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    redis.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);
    });

    redis.on('connect', () => {
      console.log('[Redis] Connected');
    });
  }
  return redis;
}

export async function connectRedis(): Promise<void> {
  if (!isRedisEnabled()) {
    console.log('[Redis] Disabled via REDIS_ENABLED=false');
    return;
  }

  try {
    const client = getRedis();
    await client?.connect();
  } catch (err: any) {
    console.warn('[Redis] Could not connect, continuing without cache:', err.message);
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
