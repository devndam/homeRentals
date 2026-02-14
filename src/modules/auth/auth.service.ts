import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AppDataSource } from '../../config/data-source';
import { User } from '../users/user.entity';
import { env } from '../../config/env';
import { ApiError } from '../../utils/api-error';
import { JwtPayload, UserRole } from '../../types';
import { RegisterDto, LoginDto } from './auth.dto';
import { getRedis } from '../../config/redis';

const userRepo = () => AppDataSource.getRepository(User);

export class AuthService {
  async register(dto: RegisterDto) {
    const existing = await userRepo().findOne({
      where: [{ email: dto.email }, { phone: dto.phone }],
    });

    if (existing) {
      throw ApiError.conflict(
        existing.email === dto.email
          ? 'Email already registered'
          : 'Phone number already registered',
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = userRepo().create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email.toLowerCase().trim(),
      phone: dto.phone,
      password: hashedPassword,
      role: dto.role || UserRole.TENANT,
    });

    await userRepo().save(user);

    const tokens = this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await userRepo().findOne({
      where: { email: dto.email.toLowerCase().trim() },
      select: ['id', 'email', 'password', 'role', 'firstName', 'lastName', 'phone', 'isActive'],
    });

    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (!user.isActive) {
      throw ApiError.forbidden('Account has been deactivated');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const tokens = this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = jwt.verify(refreshToken, env.jwt.refreshSecret) as JwtPayload;

      // Check if token is blacklisted (only when Redis is enabled)
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

      const user = await userRepo().findOne({ where: { id: payload.sub } });
      if (!user || !user.isActive) {
        throw ApiError.unauthorized('User not found or inactive');
      }

      // Blacklist old refresh token
      if (redis) {
        try {
          await redis.setex(`bl:${refreshToken}`, 7 * 24 * 3600, '1');
        } catch {
          // Redis error — skip
        }
      }

      return this.generateTokens(user);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw ApiError.unauthorized('Invalid refresh token');
    }
  }

  async forgotPassword(email: string) {
    const user = await userRepo().findOne({ where: { email: email.toLowerCase().trim() } });
    if (!user) {
      // Don't reveal whether email exists
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    await userRepo().save(user);

    // TODO: Send email with reset link: `${env.frontendUrl}/reset-password?token=${resetToken}`
    console.log(`[Auth] Password reset token for ${email}: ${resetToken}`);

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await userRepo().findOne({
      where: { passwordResetToken: hashedToken },
    });

    if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      throw ApiError.badRequest('Invalid or expired reset token');
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await userRepo().save(user);

    return { message: 'Password reset successful' };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await userRepo().findOne({
      where: { id: userId },
      select: ['id', 'password'],
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      throw ApiError.badRequest('Current password is incorrect');
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await userRepo().save(user);

    return { message: 'Password changed successfully' };
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

  // ─── Helpers ────────────────────────────────

  private generateTokens(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, env.jwt.accessSecret, {
      expiresIn: env.jwt.accessExpiry as any,
    });

    const refreshToken = jwt.sign(payload, env.jwt.refreshSecret, {
      expiresIn: env.jwt.refreshExpiry as any,
    });

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: User) {
    const { password, passwordResetToken, passwordResetExpires, ...safe } = user;
    return safe;
  }
}
