import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

// Transactional email over SMTP — works with Gmail/Google Workspace, Zoho, Hostinger, Outlook, Resend, SES…
// Optional: without SMTP settings the app still works — "forgot password" then tells people to ask an administrator.
export const emailEnabled = () => !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

let transport: Transporter | null = null;
function mailer() {
  const port = Number(process.env.SMTP_PORT ?? 465);
  return (transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465, // 465 = TLS from the start; 587 = STARTTLS
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  }));
}

export async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  if (!emailEnabled()) return false;
  try {
    await mailer().sendMail({ from: process.env.EMAIL_FROM || process.env.SMTP_USER, to, subject, text });
    return true;
  } catch (e) {
    console.error("email send failed:", (e as Error).message); // never log credentials
    return false;
  }
}

/** Public base URL for links in emails — from config, never from the request's Host header (link poisoning). */
export function appUrl() {
  // Never the request's Host header (spoofable → reset links pointing at an attacker's site).
  // On Vercel without APP_URL, use the production domain Vercel sets for every deployment.
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return (process.env.APP_URL || (vercel ? `https://${vercel}` : "http://localhost:3100")).replace(/\/$/, "");
}
