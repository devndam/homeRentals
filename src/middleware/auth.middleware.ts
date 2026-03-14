import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from '../utils/api-error';
import { AuthenticatedRequest, JwtPayload, AdminPermission } from '../types';
import { AppDataSource } from '../config/data-source';
import { User } from '../modules/users/user.entity';

/**
 * Verifies JWT access token from Authorization header.
 */
export function authenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Missing or invalid authorization header');
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, env.jwt.accessSecret) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }
}

/**
 * Restricts access to users with isPropertyOwner = true.
 * Falls back to DB check in case JWT is stale (e.g. user upgraded after login).
 */
export function requirePropertyOwner() {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user || req.user.type !== 'user') {
      throw ApiError.forbidden('Property owner access required');
    }

    if (req.user.isPropertyOwner) {
      return next();
    }

    // JWT may be stale — check DB
    const user = await AppDataSource.getRepository(User).findOne({
      where: { id: req.user.sub },
      select: ['id', 'isPropertyOwner'],
    });

    if (!user?.isPropertyOwner) {
      throw ApiError.forbidden('Property owner access required');
    }

    req.user.isPropertyOwner = true;
    next();
  };
}

/**
 * Requires admin JWT + specific granular permission(s).
 * Super admins bypass all permission checks.
 */
export function requirePermission(...required: AdminPermission[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user || req.user.type !== 'admin') {
      throw ApiError.forbidden('Admin access required');
    }

    // Super admins have all permissions
    if (req.user.isSuperAdmin) {
      return next();
    }

    const adminPerms = req.user.permissions || [];
    const missing = required.filter((p) => !adminPerms.includes(p));

    if (missing.length > 0) {
      throw ApiError.forbidden(
        `Missing required permission(s): ${missing.join(', ')}`,
      );
    }

    next();
  };
}
