import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optional(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

export const env = {
  nodeEnv: optional('NODE_ENV', 'development'),
  port: parseInt(optional('PORT', '3000'), 10),
  apiPrefix: optional('API_PREFIX', '/api/v1'),

  db: {
    host: optional('DB_HOST', 'localhost'),
    port: parseInt(optional('DB_PORT', '5432'), 10),
    username: optional('DB_USERNAME', 'postgres'),
    password: optional('DB_PASSWORD', 'postgres'),
    name: optional('DB_NAME', 'rentals_db'),
  },

  redis: {
    enabled: optional('REDIS_ENABLED', 'false') === 'true',
    host: optional('REDIS_HOST', 'localhost'),
    port: parseInt(optional('REDIS_PORT', '6379'), 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  jwt: {
    accessSecret: optional('JWT_ACCESS_SECRET', 'dev-access-secret'),
    refreshSecret: optional('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
    accessExpiry: optional('JWT_ACCESS_EXPIRY', '15m'),
    refreshExpiry: optional('JWT_REFRESH_EXPIRY', '7d'),
  },

  paystack: {
    secretKey: optional('PAYSTACK_SECRET_KEY', ''),
    publicKey: optional('PAYSTACK_PUBLIC_KEY', ''),
    webhookSecret: optional('PAYSTACK_WEBHOOK_SECRET', ''),
    commissionPercent: parseFloat(optional('PLATFORM_COMMISSION_PERCENT', '5')),
  },

  storage: {
    endpoint: optional('STORAGE_ENDPOINT', 'http://localhost:9000'),
    accessKey: optional('STORAGE_ACCESS_KEY', 'minioadmin'),
    secretKey: optional('STORAGE_SECRET_KEY', 'minioadmin'),
    bucket: optional('STORAGE_BUCKET', 'rentals'),
    region: optional('STORAGE_REGION', 'us-east-1'),
  },

  googleMapsApiKey: optional('GOOGLE_MAPS_API_KEY', ''),

  smtp: {
    host: optional('SMTP_HOST', 'smtp.mailtrap.io'),
    port: parseInt(optional('SMTP_PORT', '587'), 10),
    user: optional('SMTP_USER', ''),
    pass: optional('SMTP_PASS', ''),
    from: optional('EMAIL_FROM', 'noreply@rentals.ng'),
  },

  appUrl: optional('APP_URL', 'http://localhost:3000'),
  frontendUrl: optional('FRONTEND_URL', 'http://localhost:5173'),

  upload: {
    maxFileSizeMb: parseInt(optional('MAX_FILE_SIZE_MB', '10'), 10),
    maxFilesPerListing: parseInt(optional('MAX_FILES_PER_LISTING', '15'), 10),
  },

  get isDev(): boolean {
    return this.nodeEnv === 'development';
  },
  get isProd(): boolean {
    return this.nodeEnv === 'production';
  },
};
