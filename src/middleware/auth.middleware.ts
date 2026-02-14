import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from '../utils/api-error';
import { AuthenticatedRequest, JwtPayload, UserRole, AdminPermission } from '../types';

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
 * Restricts access to users with specified roles.
 */
export function authorize(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw ApiError.unauthorized();
    }
    if (!roles.includes(req.user.role)) {
      throw ApiError.forbidden('You do not have permission to access this resource');
    }
    next();
  };
}

/**
 * Requires admin role + specific granular permission(s).
 * Super admins bypass all permission checks.
 */
export function requirePermission(...required: AdminPermission[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw ApiError.unauthorized();
    }

    if (req.user.role !== UserRole.ADMIN) {
      throw ApiError.forbidden('Admin access required');
    }

    // Super admins have all permissions
    if (req.user.isSuperAdmin) {
      return next();
    }

    const userPerms = req.user.permissions || [];
    const missing = required.filter((p) => !userPerms.includes(p));

    if (missing.length > 0) {
      throw ApiError.forbidden(
        `Missing required permission(s): ${missing.join(', ')}`,
      );
    }

    next();
  };
}
