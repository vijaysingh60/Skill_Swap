import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

/**
 * Outgoing email is optional, same pattern as JaaS video (utils/jaas.js): read credentials lazily so
 * the server runs fine without them. If SMTP isn't configured, the verification link is logged to
 * the server console instead of emailed, which is enough to demo or test the app locally.
 */
function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!host || !port || !user || !pass) return null;
  return { host, port, user, pass, from: process.env.SMTP_FROM?.trim() || `Skill Swap <${user}>` };
}

let cachedTransporter;
function getTransporter(smtp) {
  // Reuse one transporter (and its connection pool) across requests instead of reconnecting each time.
  cachedTransporter ??= nodemailer.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.port === 465, auth: { user: smtp.user, pass: smtp.pass } });
  return cachedTransporter;
}

/** Fire-and-forget: a failed send should never fail registration itself. */
export async function sendVerificationEmail(user, token) {
  const link = `${config.clientUrl}/verify-email?token=${token}`;
  const smtp = getSmtpConfig();

  if (!smtp) {
    // Dev/demo fallback. Quiet during automated tests, which read the token straight from the database.
    if (config.nodeEnv !== 'test') {
      console.log(`[mailer] SMTP not configured — verification link for ${user.email}:\n  ${link}`);
    }
    return;
  }

  try {
    await getTransporter(smtp).sendMail({
      from: smtp.from,
      to: user.email,
      subject: 'Verify your Skill Swap email',
      text: `Hi ${user.name},\n\nConfirm your email to finish setting up Skill Swap:\n${link}\n\nThis link expires in 24 hours. If you didn't create this account, you can ignore this email.`,
      html: `<p>Hi ${user.name},</p><p>Confirm your email to finish setting up Skill Swap:</p><p><a href="${link}">${link}</a></p><p>This link expires in 24 hours. If you didn't create this account, you can ignore this email.</p>`,
    });
  } catch (err) {
    console.error(`[mailer] Could not send verification email to ${user.email}:`, err.message);
  }
}
