import nodemailer from 'nodemailer';
import { env } from '../config/env';

const appName = env.appName;
const frontendUrl = env.frontendUrl;

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  auth: {
    user: env.smtp.user,
    pass: env.smtp.pass,
  },
});

// ─── Shared layout ────────────────────────────

function layout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${appName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <!-- Header -->
          <tr>
            <td style="background-color: #1e3a5f; padding: 28px 40px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="margin: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px;">
                ${appName}
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color: #ffffff; padding: 40px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.7; color: #374151;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb; text-align: center; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280;">
                &copy; ${new Date().getFullYear()} ${appName}. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                This is an automated message. Please do not reply directly to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function heading(text: string): string {
  return `<h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 700; color: #111827;">${text}</h2>`;
}

function greeting(name: string): string {
  return `<p style="margin: 0 0 16px;">Hi ${name},</p>`;
}

function paragraph(text: string): string {
  return `<p style="margin: 0 0 16px;">${text}</p>`;
}

function codeBlock(code: string, letterSpacing = '8px', fontSize = '32px'): string {
  return `
    <div style="background-color: #f0f4ff; border: 1px solid #dbeafe; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
      <span style="font-family: 'Courier New', monospace; font-size: ${fontSize}; font-weight: 700; color: #1e3a5f; letter-spacing: ${letterSpacing};">
        ${code}
      </span>
    </div>`;
}

function infoCard(label: string, value: string, accent = '#1e3a5f'): string {
  return `
    <div style="background-color: #f9fafb; border-left: 4px solid ${accent}; border-radius: 0 8px 8px 0; padding: 16px 20px; margin: 24px 0;">
      <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280;">${label}</p>
      <p style="margin: 0; font-size: 24px; font-weight: 700; color: ${accent};">${value}</p>
    </div>`;
}

function button(text: string, href: string): string {
  return `
    <div style="text-align: center; margin: 32px 0;">
      <a href="${href}" style="display: inline-block; background-color: #1e3a5f; color: #ffffff; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600; letter-spacing: 0.3px;">
        ${text}
      </a>
    </div>`;
}

function linkFallback(href: string): string {
  return `<p style="margin: 0 0 16px; font-size: 13px; color: #6b7280; word-break: break-all;">Or copy this link: <a href="${href}" style="color: #1e3a5f;">${href}</a></p>`;
}

function divider(): string {
  return `<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />`;
}

// ─── Email methods ────────────────────────────

export class EmailService {
  async sendVerificationOTP(email: string, firstName: string, otp: string): Promise<void> {
    await transporter.sendMail({
      from: env.smtp.from,
      to: email,
      subject: `Verify your email - ${appName}`,
      html: layout(`
        ${heading('Email Verification')}
        ${greeting(firstName)}
        ${paragraph('Thank you for signing up. Please use the verification code below to confirm your email address.')}
        ${codeBlock(otp)}
        ${paragraph('This code expires in <strong>10 minutes</strong>.')}
        ${divider()}
        ${paragraph('<span style="font-size: 13px; color: #6b7280;">If you did not create an account, you can safely ignore this email.</span>')}
      `),
    });
  }

  async sendAdminWelcome(email: string, firstName: string, password: string): Promise<void> {
    const loginUrl = `${frontendUrl}/controls/sign-in`;
    await transporter.sendMail({
      from: env.smtp.from,
      to: email,
      subject: `You've been added as an admin - ${appName}`,
      html: layout(`
        ${heading('Welcome to the Admin Team')}
        ${greeting(firstName)}
        ${paragraph(`You have been added as an administrator on <strong>${appName}</strong>. Use the credentials below to access the admin dashboard.`)}
        ${divider()}
        ${paragraph(`<strong>Login URL:</strong> <a href="${loginUrl}" style="color: #1e3a5f;">${loginUrl}</a>`)}
        ${paragraph(`<strong>Email:</strong> ${email}`)}
        ${paragraph('<strong>Temporary Password:</strong>')}
        ${codeBlock(password, '4px', '24px')}
        ${button('Go to Admin Dashboard', loginUrl)}
        ${divider()}
        ${paragraph('<span style="font-size: 13px; color: #6b7280;"><strong>Important:</strong> Please change your password immediately after your first login for security purposes.</span>')}
      `),
    });
  }

  async sendAdminPasswordReset(email: string, firstName: string, newPassword: string): Promise<void> {
    await transporter.sendMail({
      from: env.smtp.from,
      to: email,
      subject: `Your password has been reset - ${appName}`,
      html: layout(`
        ${heading('Password Reset')}
        ${greeting(firstName)}
        ${paragraph('Your password has been reset by an administrator. Please use the temporary password below to log in.')}
        ${codeBlock(newPassword, '4px', '24px')}
        ${button('Log In', frontendUrl + '/login')}
        ${divider()}
        ${paragraph('<span style="font-size: 13px; color: #6b7280;"><strong>Important:</strong> Please change your password immediately after logging in for security purposes.</span>')}
      `),
    });
  }

  async sendPasswordResetEmail(email: string, firstName: string, resetToken: string): Promise<void> {
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    await transporter.sendMail({
      from: env.smtp.from,
      to: email,
      subject: `Reset your password - ${appName}`,
      html: layout(`
        ${heading('Password Reset Request')}
        ${greeting(firstName)}
        ${paragraph('We received a request to reset your password. Click the button below to create a new password.')}
        ${button('Reset Password', resetUrl)}
        ${linkFallback(resetUrl)}
        ${paragraph('This link expires in <strong>30 minutes</strong>.')}
        ${divider()}
        ${paragraph('<span style="font-size: 13px; color: #6b7280;">If you did not request a password reset, please ignore this email. Your password will remain unchanged.</span>')}
      `),
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
      subject: `Rent due soon for ${propertyTitle} - ${appName}`,
      html: layout(`
        ${heading('Rent Payment Reminder')}
        ${greeting(firstName)}
        ${paragraph(`This is a friendly reminder that your rent for <strong>${propertyTitle}</strong> is due on <strong>${formatted}</strong>.`)}
        ${infoCard('Amount Due', `&#8358;${rentAmount.toLocaleString()}`)}
        ${button('Go to Dashboard', frontendUrl + '/dashboard')}
        ${paragraph('Please ensure your payment is made before the due date to avoid any late fees or disruptions.')}
      `),
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
      subject: `OVERDUE: Rent payment for ${propertyTitle} - ${appName}`,
      html: layout(`
        ${heading('<span style="color: #dc2626;">Overdue Rent Payment</span>')}
        ${greeting(firstName)}
        ${paragraph(`Your rent for <strong>${propertyTitle}</strong> was due on <strong>${formatted}</strong> and has not been received.`)}
        ${infoCard('Overdue Amount', `&#8358;${rentAmount.toLocaleString()}`, '#dc2626')}
        ${button('Make Payment Now', frontendUrl + '/dashboard')}
        ${paragraph('Please complete your payment as soon as possible to avoid further action on your account.')}
      `),
    });
  }

  async sendOrgInvite(email: string, orgName: string): Promise<void> {
    await transporter.sendMail({
      from: env.smtp.from,
      to: email,
      subject: `You've been invited to join ${orgName} - ${appName}`,
      html: layout(`
        ${heading('Organisation Invitation')}
        <p style="margin: 0 0 16px;">Hi,</p>
        ${paragraph(`You have been invited to join <strong>${orgName}</strong> on ${appName} as a staff member.`)}
        ${paragraph('Log in to your dashboard to review and accept or decline this invitation.')}
        ${button('View Invitation', frontendUrl + '/dashboard')}
        ${divider()}
        ${paragraph('<span style="font-size: 13px; color: #6b7280;">If you were not expecting this invitation, you can safely ignore this email.</span>')}
      `),
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

    const title = isOverdue ? '<span style="color: #dc2626;">Overdue Rent Notification</span>' : 'Upcoming Rent Notification';
    const body = isOverdue
      ? `Rent from your tenant <strong>${tenantName}</strong> for <strong>${propertyTitle}</strong> was due on <strong>${formatted}</strong> and has not been received.`
      : `Rent from your tenant <strong>${tenantName}</strong> for <strong>${propertyTitle}</strong> is due on <strong>${formatted}</strong>.`;
    const note = isOverdue
      ? 'You may want to follow up with your tenant regarding this overdue payment.'
      : 'No action is needed from you at this time. We will notify the tenant as well.';

    await transporter.sendMail({
      from: env.smtp.from,
      to: email,
      subject: `${subject} - ${appName}`,
      html: layout(`
        ${heading(title)}
        ${greeting(firstName)}
        ${paragraph(body)}
        ${button('View Details', frontendUrl + '/dashboard/landlord')}
        ${paragraph(note)}
      `),
    });
  }
}
