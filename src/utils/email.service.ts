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

  async sendAdminPasswordReset(email: string, firstName: string, newPassword: string): Promise<void> {
    await transporter.sendMail({
      from: env.smtp.from,
      to: email,
      subject: 'Your password has been reset - Rentals NG',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset by Admin</h2>
          <p>Hi ${firstName},</p>
          <p>Your password has been reset by an administrator. Your new temporary password is:</p>
          <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; margin: 20px 0;">
            ${newPassword}
          </div>
          <p>Please log in and change your password immediately for security.</p>
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

  async sendRentReminder(
    email: string,
    firstName: string,
    propertyTitle: string,
    dueDate: string,
    rentAmount: number,
  ): Promise<void> {
    const formatted = new Date(dueDate).toLocaleDateString('en-NG', { month: 'long', day: 'numeric', year: 'numeric' });
    await transporter.sendMail({
      from: env.smtp.from,
      to: email,
      subject: `Rent due soon for ${propertyTitle} - Rentals NG`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Rent Payment Reminder</h2>
          <p>Hi ${firstName},</p>
          <p>This is a friendly reminder that your rent for <strong>${propertyTitle}</strong> is due on <strong>${formatted}</strong>.</p>
          <div style="background: #f4f4f4; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #666;">Amount Due</p>
            <p style="margin: 4px 0 0; font-size: 24px; font-weight: bold;">&#8358;${rentAmount.toLocaleString()}</p>
          </div>
          <p>Please log in to your dashboard to make the payment before the due date.</p>
          <br/>
          <p>- Rentals NG Team</p>
        </div>
      `,
    });
  }

  async sendRentOverdue(
    email: string,
    firstName: string,
    propertyTitle: string,
    dueDate: string,
    rentAmount: number,
  ): Promise<void> {
    const formatted = new Date(dueDate).toLocaleDateString('en-NG', { month: 'long', day: 'numeric', year: 'numeric' });
    await transporter.sendMail({
      from: env.smtp.from,
      to: email,
      subject: `OVERDUE: Rent payment for ${propertyTitle} - Rentals NG`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Overdue Rent Payment</h2>
          <p>Hi ${firstName},</p>
          <p>Your rent for <strong>${propertyTitle}</strong> was due on <strong>${formatted}</strong> and has not been received.</p>
          <div style="background: #fef2f2; padding: 16px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #666;">Overdue Amount</p>
            <p style="margin: 4px 0 0; font-size: 24px; font-weight: bold; color: #dc2626;">&#8358;${rentAmount.toLocaleString()}</p>
          </div>
          <p>Please log in to your dashboard and complete the payment as soon as possible to avoid further action.</p>
          <br/>
          <p>- Rentals NG Team</p>
        </div>
      `,
    });
  }

  async sendRentReminderToOwner(
    email: string,
    firstName: string,
    tenantName: string,
    propertyTitle: string,
    dueDate: string,
    isOverdue: boolean,
  ): Promise<void> {
    const formatted = new Date(dueDate).toLocaleDateString('en-NG', { month: 'long', day: 'numeric', year: 'numeric' });
    const subject = isOverdue
      ? `OVERDUE: ${tenantName}'s rent for ${propertyTitle}`
      : `Upcoming rent due: ${tenantName} - ${propertyTitle}`;

    await transporter.sendMail({
      from: env.smtp.from,
      to: email,
      subject: `${subject} - Rentals NG`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>${isOverdue ? 'Overdue Rent Notification' : 'Upcoming Rent Notification'}</h2>
          <p>Hi ${firstName},</p>
          ${isOverdue
            ? `<p>Rent from your tenant <strong>${tenantName}</strong> for <strong>${propertyTitle}</strong> was due on <strong>${formatted}</strong> and has not been received.</p>`
            : `<p>Rent from your tenant <strong>${tenantName}</strong> for <strong>${propertyTitle}</strong> is due on <strong>${formatted}</strong>.</p>`
          }
          <p>You can check the status on your landlord dashboard.</p>
          <br/>
          <p>- Rentals NG Team</p>
        </div>
      `,
    });
  }
}
