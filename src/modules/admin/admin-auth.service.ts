import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../../config/data-source';
import { Admin } from './admin.entity';
import { env } from '../../config/env';
import { ApiError } from '../../utils/api-error';
import { AdminJwtPayload } from '../../types';
import { LoginDto } from '../auth/auth.dto';
import { getRedis } from '../../config/redis';

const adminRepo = () => AppDataSource.getRepository(Admin);

export class AdminAuthService {
  async login(dto: LoginDto) {
    const admin = await adminRepo().findOne({
      where: { email: dto.email.toLowerCase().trim() },
      select: ['id', 'email', 'password', 'firstName', 'lastName', 'phone', 'isActive', 'isSuperAdmin', 'permissions'],
    });

    if (!admin) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (!admin.isActive) {
      throw ApiError.forbidden('Account has been deactivated');
    }

    const valid = await bcrypt.compare(dto.password, admin.password);
    if (!valid) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const tokens = this.generateTokens(admin);

    return {
      admin: this.sanitizeAdmin(admin),
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = jwt.verify(refreshToken, env.jwt.refreshSecret) as AdminJwtPayload;

      if (payload.type !== 'admin') {
        throw ApiError.unauthorized('Invalid refresh token');
      }

      const redis = getRedis();
      if (redis) {
        try {
          const blacklisted = await redis.get(`bl:${refreshToken}`);
          if (blacklisted) {
            throw ApiError.unauthorized('Token has been revoked');
          }
        } catch (e: any) {
          if (e instanceof ApiError) throw e;
        }
      }

      const admin = await adminRepo().findOne({ where: { id: payload.sub } });
      if (!admin || !admin.isActive) {
        throw ApiError.unauthorized('Admin not found or inactive');
      }

      if (redis) {
        try {
          await redis.setex(`bl:${refreshToken}`, 7 * 24 * 3600, '1');
        } catch {
          // Redis error — skip
        }
      }

      return this.generateTokens(admin);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw ApiError.unauthorized('Invalid refresh token');
    }
  }

  async logout(refreshToken: string) {
    const redis = getRedis();
    if (redis) {
      try {
        await redis.setex(`bl:${refreshToken}`, 7 * 24 * 3600, '1');
      } catch {
        // Redis error — skip
      }
    }
    return { message: 'Logged out successfully' };
  }

  private generateTokens(admin: Admin) {
    const payload: AdminJwtPayload = {
      sub: admin.id,
      email: admin.email,
      type: 'admin',
      isSuperAdmin: admin.isSuperAdmin || false,
      permissions: admin.isSuperAdmin ? [] : (admin.permissions || []),
    };

    const accessToken = jwt.sign(payload, env.jwt.accessSecret, {
      expiresIn: env.jwt.accessExpiry as any,
    });

    const refreshToken = jwt.sign(payload, env.jwt.refreshSecret, {
      expiresIn: env.jwt.refreshExpiry as any,
    });

    return { accessToken, refreshToken };
  }

  private sanitizeAdmin(admin: Admin) {
    const { password, passwordResetToken, passwordResetExpires, ...safe } = admin;
    return safe;
  }
}
