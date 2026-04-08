import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/api-error';
import { sendError } from '../utils/response';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return sendError(res, err.statusCode, err.message, err.errors);
  }

  // TypeORM unique constraint
  if (err.message?.includes('duplicate key')) {
    return sendError(res, 409, 'A record with this value already exists');
  }

  logger.error(`${req.method} ${req.originalUrl}`, err);

  const message = env.isProd ? 'Internal server error' : err.message;
  return sendError(res, 500, message);
}
