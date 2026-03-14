import nodemailer from 'nodemailer';
import { env } from '../config/env';

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  auth: {
    user: env.smtp.user,
    pass: env.smtp.pass,
  },
});

export class EmailService {
  async sendVerificationOTP(email: string, firstName: string, otp: string): Promise<void> {
    await transporter.sendMail({
      from: env.smtp.from,
      to: email,
      subject: 'Verify your email - Rentals NG',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Email Verification</h2>
          <p>Hi ${firstName},</p>
          <p>Your verification code is:</p>
          <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
            ${otp}
          </div>
          <p>This code expires in <strong>10 minutes</strong>.</p>
          <p>If you did not create an account, please ignore this email.</p>
          <br/>
          <p>- Rentals NG Team</p>
        </div>
      `,
    });
  }

  async sendPasswordResetEmail(email: string, firstName: string, resetToken: string): Promise<void> {
    const resetUrl = `${env.frontendUrl}/reset-password?token=${resetToken}`;

    await transporter.sendMail({
      from: env.smtp.from,
      to: email,
      subject: 'Reset your password - Rentals NG',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset</h2>
          <p>Hi ${firstName},</p>
          <p>You requested a password reset. Click the button below to set a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: #2563eb; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p>Or copy this link: <a href="${resetUrl}">${resetUrl}</a></p>
          <p>This link expires in <strong>30 minutes</strong>.</p>
          <p>If you did not request this, please ignore this email.</p>
          <br/>
          <p>- Rentals NG Team</p>
        </div>
      `,
    });
  }
}
