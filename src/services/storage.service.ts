import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env';
import { AppDataSource } from '../config/data-source';
import { SystemSettings } from '../modules/settings/system-settings.entity';

type StorageProvider = 'local' | 'cloudinary' | 'do_spaces';

let cachedProvider: StorageProvider = 'local';
let cacheTime = 0;
const CACHE_TTL = 30_000; // 30 seconds

async function getActiveProvider(): Promise<StorageProvider> {
  if (Date.now() - cacheTime < CACHE_TTL) return cachedProvider;

  try {
    const repo = AppDataSource.getRepository(SystemSettings);
    const settings = await repo.findOne({ where: {} });
    if (settings) {
      cachedProvider = settings.storageProvider as StorageProvider;
    }
  } catch {
    // DB not ready yet — fall back to local
  }
  cacheTime = Date.now();
  return cachedProvider;
}

export function invalidateStorageCache(): void {
  cacheTime = 0;
}

// ─── Cloudinary ─────────────────────────────

function getCloudinary() {
  if (env.cloudinary.url) {
    cloudinary.config({ cloudinary_url: env.cloudinary.url });
  } else {
    cloudinary.config({
      cloud_name: env.cloudinary.cloudName,
      api_key: env.cloudinary.apiKey,
      api_secret: env.cloudinary.apiSecret,
    });
  }
  return cloudinary;
}

async function uploadToCloudinary(filePath: string, originalName: string): Promise<string> {
  const cl = getCloudinary();
  const folder = 'rentals';
  const result = await cl.uploader.upload(filePath, {
    folder,
    resource_type: 'auto',
    public_id: path.parse(originalName).name,
    use_filename: true,
    unique_filename: true,
  });
  return result.secure_url;
}

async function deleteFromCloudinary(url: string): Promise<void> {
  const cl = getCloudinary();
  // Extract public_id from Cloudinary URL
  const parts = url.split('/');
  const uploadIdx = parts.indexOf('upload');
  if (uploadIdx === -1) return;
  // skip version segment (v1234567890)
  const publicIdParts = parts.slice(uploadIdx + 2);
  const lastPart = publicIdParts[publicIdParts.length - 1];
  publicIdParts[publicIdParts.length - 1] = lastPart.replace(/\.[^.]+$/, '');
  const publicId = publicIdParts.join('/');
  await cl.uploader.destroy(publicId);
}

// ─── DO Spaces (S3) ─────────────────────────

function getS3Client(): S3Client {
  return new S3Client({
    endpoint: env.storage.endpoint,
    region: env.storage.region,
    credentials: {
      accessKeyId: env.storage.accessKey,
      secretAccessKey: env.storage.secretKey,
    },
    forcePathStyle: false,
  });
}

async function uploadToSpaces(filePath: string, filename: string): Promise<string> {
  const client = getS3Client();
  const key = `uploads/${filename}`;
  const body = fs.readFileSync(filePath);
  const contentType = getContentType(filename);

  await client.send(new PutObjectCommand({
    Bucket: env.storage.bucket,
    Key: key,
    Body: body,
    ACL: 'public-read',
    ContentType: contentType,
  }));

  // Build public URL from endpoint
  const endpoint = env.storage.endpoint.replace('https://', '').replace('http://', '');
  return `https://${env.storage.bucket}.${endpoint}/${key}`;
}

async function deleteFromSpaces(url: string): Promise<void> {
  const client = getS3Client();
  const urlObj = new URL(url);
  const key = urlObj.pathname.startsWith('/') ? urlObj.pathname.slice(1) : urlObj.pathname;

  await client.send(new DeleteObjectCommand({
    Bucket: env.storage.bucket,
    Key: key,
  }));
}

// ─── Local ──────────────────────────────────

async function uploadToLocal(filePath: string, filename: string): Promise<string> {
  const dest = path.join(process.cwd(), 'uploads', filename);
  fs.copyFileSync(filePath, dest);
  return `/uploads/${filename}`;
}

function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const types: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.pdf': 'application/pdf',
  };
  return types[ext] || 'application/octet-stream';
}

// ─── Public API ─────────────────────────────

export const storageService = {
  async upload(file: Express.Multer.File): Promise<string> {
    const provider = await getActiveProvider();

    let url: string;
    switch (provider) {
      case 'cloudinary':
        url = await uploadToCloudinary(file.path, file.filename);
        break;
      case 'do_spaces':
        url = await uploadToSpaces(file.path, file.filename);
        break;
      case 'local':
      default:
        url = await uploadToLocal(file.path, file.filename);
        break;
    }

    // Clean up temp file (unless local moved it)
    if (provider !== 'local' && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    return url;
  },

  async delete(url: string): Promise<void> {
    if (!url) return;

    // Cloud URLs
    if (url.includes('cloudinary.com')) {
      await deleteFromCloudinary(url);
    } else if (url.includes(env.storage.endpoint.replace('https://', '').replace('http://', '')) && env.storage.endpoint) {
      await deleteFromSpaces(url);
    }
    // Local files: don't delete (they're served statically and may still be referenced)
  },

  async getActiveProvider(): Promise<StorageProvider> {
    return getActiveProvider();
  },
};
