import nodemailer, { Transporter } from 'nodemailer';
import { logger } from './logger';

// Transactional email (verification, password reset) via plain SMTP.
// Marketing-send providers (Resend/SendGrid/Mailgun/SES) are a Phase 2
// concern for the campaigns module — this is intentionally the simplest
// thing that can actually deliver an account-security email today.
let transporter: Transporter | null = null;
let smtpConfigured = false;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
    return null;
  }

  smtpConfigured = true;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587', 10),
    secure: SMTP_PORT === '465',
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });

  return transporter;
}

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Sends a transactional email. If SMTP isn't configured (local dev, CI,
 * or a fresh deploy before credentials are set), logs the content instead
 * of throwing — this keeps registration/password-reset usable without
 * blocking on email infrastructure, at the cost of not actually notifying
 * the user. Never silently swallow in production: a misconfigured SMTP
 * there should be visible in logs, which this still provides.
 */
export async function sendMail(options: SendMailOptions): Promise<void> {
  const client = getTransporter();

  if (!client) {
    logger.warn(
      `[mailer] SMTP not configured — logging email instead of sending. to=${options.to} subject="${options.subject}"`
    );
    logger.info(`[mailer] Would have sent:\n${options.text}`);
    return;
  }

  const fromName = process.env.SMTP_FROM_NAME || 'MarketFlow';
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

  await client.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
}

export function isSmtpConfigured(): boolean {
  // Force resolution so this reflects current env even if called before sendMail
  getTransporter();
  return smtpConfigured;
}

export function verificationEmailContent(name: string, link: string) {
  return {
    subject: 'Verify your MarketFlow email address',
    text: `Hi ${name},\n\nPlease verify your email address by visiting:\n${link}\n\nThis link expires in 24 hours.\n\nIf you didn't create a MarketFlow account, you can ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Verify your email</h2>
        <p>Hi ${name},</p>
        <p>Please confirm your email address to finish setting up your MarketFlow account.</p>
        <p style="margin: 24px 0;">
          <a href="${link}" style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Verify Email</a>
        </p>
        <p style="color: #6b7280; font-size: 13px;">This link expires in 24 hours. If you didn't create a MarketFlow account, you can ignore this email.</p>
      </div>
    `,
  };
}

export function passwordResetEmailContent(name: string, link: string) {
  return {
    subject: 'Reset your MarketFlow password',
    text: `Hi ${name},\n\nWe received a request to reset your password. Visit this link to choose a new one:\n${link}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email — your password will not be changed.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Reset your password</h2>
        <p>Hi ${name},</p>
        <p>We received a request to reset your password.</p>
        <p style="margin: 24px 0;">
          <a href="${link}" style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
        </p>
        <p style="color: #6b7280; font-size: 13px;">This link expires in 1 hour. If you didn't request this, you can ignore this email — your password will not be changed.</p>
      </div>
    `,
  };
}
