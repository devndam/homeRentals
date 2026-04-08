import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import { AppDataSource } from '../../config/data-source';
import { User } from '../users/user.entity';
import { env } from '../../config/env';
import { ApiError } from '../../utils/api-error';
import { UserJwtPayload, JwtPayload } from '../../types';
import { RegisterDto, LoginDto } from './auth.dto';
import { getRedis } from '../../config/redis';
import { WalletService } from '../wallet/wallet.service';
import { EmailService } from '../../utils/email.service';
import { OtpService } from '../../utils/otp.service';

const userRepo = () => AppDataSource.getRepository(User);
const walletService = new WalletService();
const emailService = new EmailService();

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
      isPropertyOwner: dto.isPropertyOwner || false,
    });

    await userRepo().save(user);

    // Generate 6-digit OTP for email verification
    const { otp, hashedOTP } = OtpService.generate();

    user.emailVerificationOTP = hashedOTP;
    user.emailVerificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await userRepo().save(user);

    // Send verification email (fire-and-forget)
    emailService.sendVerificationOTP(user.email, user.firstName, otp).catch((err) => {
      console.error('[Auth] Failed to send verification email:', err.message);
    });

    if (user.isPropertyOwner) {
      await walletService.createWalletForUser(user.id);
    }

    const tokens = this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await userRepo().findOne({
      where: { email: dto.email.toLowerCase().trim() },
      select: ['id', 'email', 'password', 'isPropertyOwner', 'firstName', 'lastName', 'phone', 'isActive', 'emailVerified', 'twoFactorEnabled', 'twoFactorSecret'],
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

    // If 2FA is enabled, require token
    if (user.twoFactorEnabled) {
      if (!dto.twoFactorToken) {
        return { requiresTwoFactor: true };
      }

      const totp = new OTPAuth.TOTP({
        secret: OTPAuth.Secret.fromBase32(user.twoFactorSecret!),
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
      });

      const delta = totp.validate({ token: dto.twoFactorToken, window: 1 });
      if (delta === null) {
        throw ApiError.unauthorized('Invalid two-factor authentication code');
      }
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
      throw ApiError.notFound('No account found with this email address');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    await userRepo().save(user);

    // Send password reset email (fire-and-forget)
    emailService.sendPasswordResetEmail(user.email, user.firstName, resetToken).catch((err) => {
      console.error('[Auth] Failed to send password reset email:', err.message);
    });

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

  async verifyEmail(email: string, otp: string) {
    const user = await userRepo().findOne({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      throw ApiError.badRequest('Invalid email or OTP');
    }

    if (user.emailVerified) {
      throw ApiError.badRequest('Email is already verified');
    }

    if (!user.emailVerificationOTP || !user.emailVerificationExpires) {
      throw ApiError.badRequest('No verification OTP found. Please request a new one');
    }

    if (user.emailVerificationExpires < new Date()) {
      throw ApiError.badRequest('Verification OTP has expired. Please request a new one');
    }

    if (OtpService.hash(otp) !== user.emailVerificationOTP) {
      throw ApiError.badRequest('Invalid email or OTP');
    }

    user.emailVerified = true;
    user.emailVerificationOTP = undefined;
    user.emailVerificationExpires = undefined;
    await userRepo().save(user);

    return { message: 'Email verified successfully' };
  }

  async resendVerificationOTP(email: string) {
    const user = await userRepo().findOne({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return { message: 'If the email exists, a verification OTP has been sent' };
    }

    if (user.emailVerified) {
      throw ApiError.badRequest('Email is already verified');
    }

    const { otp, hashedOTP } = OtpService.generate();

    user.emailVerificationOTP = hashedOTP;
    user.emailVerificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await userRepo().save(user);

    emailService.sendVerificationOTP(user.email, user.firstName, otp).catch((err) => {
      console.error('[Auth] Failed to send verification email:', err.message);
    });

    return { message: 'If the email exists, a verification OTP has been sent' };
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

  async setupTwoFactor(userId: string) {
    const user = await userRepo().findOne({
      where: { id: userId },
      select: ['id', 'email', 'twoFactorEnabled'],
    });

    if (!user) throw ApiError.notFound('User not found');

    if (user.twoFactorEnabled) {
      throw ApiError.badRequest('Two-factor authentication is already enabled');
    }

    const secret = new OTPAuth.Secret({ size: 20 });
    const totp = new OTPAuth.TOTP({
      issuer: env.appName,
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    });

    const otpauthUrl = totp.toString();
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    // Save secret temporarily (not enabled until verified)
    await userRepo().update(user.id, { twoFactorSecret: secret.base32 });

    return {
      secret: secret.base32,
      qrCode: qrCodeDataUrl,
    };
  }

  async verifyTwoFactor(userId: string, token: string) {
    const user = await userRepo().findOne({
      where: { id: userId },
      select: ['id', 'twoFactorSecret', 'twoFactorEnabled'],
    });

    if (!user) throw ApiError.notFound('User not found');

    if (!user.twoFactorSecret) {
      throw ApiError.badRequest('Two-factor setup has not been initiated');
    }

    const totp = new OTPAuth.TOTP({
      secret: OTPAuth.Secret.fromBase32(user.twoFactorSecret),
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });

    const delta = totp.validate({ token, window: 1 });
    if (delta === null) {
      throw ApiError.badRequest('Invalid verification code');
    }

    await userRepo().update(user.id, { twoFactorEnabled: true });

    return { message: 'Two-factor authentication enabled successfully' };
  }

  async disableTwoFactor(userId: string, token: string) {
    const user = await userRepo().findOne({
      where: { id: userId },
      select: ['id', 'twoFactorSecret', 'twoFactorEnabled'],
    });

    if (!user) throw ApiError.notFound('User not found');

    if (!user.twoFactorEnabled) {
      throw ApiError.badRequest('Two-factor authentication is not enabled');
    }

    const totp = new OTPAuth.TOTP({
      secret: OTPAuth.Secret.fromBase32(user.twoFactorSecret!),
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });

    const delta = totp.validate({ token, window: 1 });
    if (delta === null) {
      throw ApiError.badRequest('Invalid verification code');
    }

    await userRepo().update(user.id, { twoFactorEnabled: false, twoFactorSecret: undefined });

    return { message: 'Two-factor authentication disabled successfully' };
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
    const payload: UserJwtPayload = {
      sub: user.id,
      email: user.email,
      type: 'user',
      isPropertyOwner: user.isPropertyOwner || false,
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
    const {
      password,
      passwordResetToken,
      passwordResetExpires,
      emailVerificationOTP,
      emailVerificationExpires,
      ...safe
    } = user;
    return safe;
  }
}
