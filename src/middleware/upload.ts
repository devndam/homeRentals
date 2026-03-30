import multer from 'multer';
import path from 'path';
import os from 'os';
import { v4 as uuid } from 'uuid';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/api-error';
import { env } from '../config/env';
import { storageService } from '../services/storage.service';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf'];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, ...ALLOWED_DOCUMENT_TYPES];

// Extend Multer.File to include storageUrl
declare global {
  namespace Express {
    namespace Multer {
      interface File {
        storageUrl?: string;
      }
    }
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, os.tmpdir());
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuid()}${ext}`);
  },
});

export const uploadMedia = multer({
  storage,
  limits: {
    fileSize: env.upload.maxFileSizeMb * 1024 * 1024,
    files: env.upload.maxFilesPerListing,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return cb(ApiError.badRequest(`File type ${file.mimetype} is not allowed`));
    }
    cb(null, true);
  },
});

/**
 * Middleware that uploads multer-processed files to the configured storage provider.
 * Must be placed AFTER uploadMedia middleware in the route chain.
 * Sets `file.storageUrl` with the final URL for each file.
 */
export async function processUpload(req: Request, _res: Response, next: NextFunction) {
  try {
    const file = req.file as Express.Multer.File | undefined;
    const files = req.files as Express.Multer.File[] | undefined;

    if (file) {
      file.storageUrl = await storageService.upload(file);
    }

    if (Array.isArray(files)) {
      for (const f of files) {
        f.storageUrl = await storageService.upload(f);
      }
    }

    next();
  } catch (err) {
    next(err);
  }
}
