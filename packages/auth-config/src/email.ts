import { Resend } from 'resend';

interface SendAuthEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

const defaultFrom = 'SEO Impact OS <onboarding@resend.dev>';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is required for auth email delivery');
  }
  return new Resend(apiKey);
}

export async function sendAuthEmail(options: SendAuthEmailOptions): Promise<void> {
  try {
    const resend = getResendClient();
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || defaultFrom,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown email error';
    throw new Error(`Auth email delivery failed: ${message}`);
  }
}

export function buildActionEmailHtml(title: string, body: string, url: string): string {
  const safeTitle = escapeHtml(title);
  const safeBody = escapeHtml(body);
  const safeUrl = escapeHtml(url);

  return [
    '<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">',
    `<h1 style="font-size: 20px;">${safeTitle}</h1>`,
    `<p>${safeBody}</p>`,
    `<p><a href="${safeUrl}" style="color: #2563eb;">Open link</a></p>`,
    '<p style="color: #6b7280; font-size: 12px;">If you did not request this, you can ignore this email.</p>',
    '</div>',
  ].join('');
}
