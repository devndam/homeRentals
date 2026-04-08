import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import { AppDataSource } from '../../config/data-source';
import { Admin } from './admin.entity';
import { env } from '../../config/env';
import { ApiError } from '../../utils/api-error';
import { AdminJwtPayload } from '../../types';
import { LoginDto } from '../auth/auth.dto';
import { getRedis } from '../../config/redis';

const adminRepo = () => AppDataSource.getRepository(Admin);

export class AdminAuthService {
  async login(dto: LoginDto & { twoFactorToken?: string }) {
    const admin = await adminRepo().findOne({
      where: { email: dto.email.toLowerCase().trim() },
      select: ['id', 'email', 'password', 'firstName', 'lastName', 'phone', 'isActive', 'isSuperAdmin', 'permissions', 'twoFactorEnabled', 'twoFactorSecret'],
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

    // If 2FA is enabled, require token
    if (admin.twoFactorEnabled) {
      if (!dto.twoFactorToken) {
        return { requiresTwoFactor: true };
      }

      const totp = new OTPAuth.TOTP({
        secret: OTPAuth.Secret.fromBase32(admin.twoFactorSecret!),
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
      });

      const delta = totp.validate({ token: dto.twoFactorToken, window: 1 });
      if (delta === null) {
        throw ApiError.unauthorized('Invalid two-factor authentication code');
      }
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

  async changePassword(adminId: string, currentPassword: string, newPassword: string) {
    const admin = await adminRepo().findOne({
      where: { id: adminId },
      select: ['id', 'password'],
    });

    if (!admin) throw ApiError.notFound('Admin not found');

    const valid = await bcrypt.compare(currentPassword, admin.password);
    if (!valid) {
      throw ApiError.badRequest('Current password is incorrect');
    }

    admin.password = await bcrypt.hash(newPassword, 12);
    await adminRepo().save(admin);

    return { message: 'Password changed successfully' };
  }

  async setupTwoFactor(adminId: string) {
    const admin = await adminRepo().findOne({
      where: { id: adminId },
      select: ['id', 'email', 'firstName', 'lastName', 'twoFactorEnabled'],
    });

    if (!admin) throw ApiError.notFound('Admin not found');

    if (admin.twoFactorEnabled) {
      throw ApiError.badRequest('Two-factor authentication is already enabled');
    }

    const secret = new OTPAuth.Secret({ size: 20 });
    const totp = new OTPAuth.TOTP({
      issuer: env.appName,
      label: admin.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    });

    const otpauthUrl = totp.toString();
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    // Save secret temporarily (not enabled until verified)
    admin.twoFactorSecret = secret.base32;
    await adminRepo().save(admin);

    return {
      secret: secret.base32,
      qrCode: qrCodeDataUrl,
    };
  }

  async verifyTwoFactor(adminId: string, token: string) {
    const admin = await adminRepo().findOne({
      where: { id: adminId },
      select: ['id', 'twoFactorSecret', 'twoFactorEnabled'],
    });

    if (!admin) throw ApiError.notFound('Admin not found');

    if (!admin.twoFactorSecret) {
      throw ApiError.badRequest('Two-factor setup has not been initiated');
    }

    const totp = new OTPAuth.TOTP({
      secret: OTPAuth.Secret.fromBase32(admin.twoFactorSecret),
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });

    const delta = totp.validate({ token, window: 1 });
    if (delta === null) {
      throw ApiError.badRequest('Invalid verification code');
    }

    admin.twoFactorEnabled = true;
    await adminRepo().save(admin);

    return { message: 'Two-factor authentication enabled successfully' };
  }

  async disableTwoFactor(adminId: string, token: string) {
    const admin = await adminRepo().findOne({
      where: { id: adminId },
      select: ['id', 'twoFactorSecret', 'twoFactorEnabled'],
    });

    if (!admin) throw ApiError.notFound('Admin not found');

    if (!admin.twoFactorEnabled) {
      throw ApiError.badRequest('Two-factor authentication is not enabled');
    }

    const totp = new OTPAuth.TOTP({
      secret: OTPAuth.Secret.fromBase32(admin.twoFactorSecret!),
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });

    const delta = totp.validate({ token, window: 1 });
    if (delta === null) {
      throw ApiError.badRequest('Invalid verification code');
    }

    admin.twoFactorEnabled = false;
    admin.twoFactorSecret = undefined;
    await adminRepo().save(admin);

    return { message: 'Two-factor authentication disabled successfully' };
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
