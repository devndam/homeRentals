import multer from 'multer';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { ApiError } from '../utils/api-error';
import { env } from '../config/env';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf'];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, ...ALLOWED_DOCUMENT_TYPES];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads'));
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
