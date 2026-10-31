import env from '../config/env.js';
import { sendMail } from '../config/mailer.js';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export async function sendPasswordResetEmail({ user, resetUrl }) {
  const subject = 'Reset your Brightloop password';

  return sendMail({
    to: user.email,
    subject,
    text: `Hello ${user.name},\n\nReset your Brightloop password using this link:\n${resetUrl}\n\nThis link expires in ${env.resetTokenTtlMinutes} minutes. If you did not request a reset, you can ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
        <h2 style="margin-bottom:8px">Reset your password</h2>
        <p>Hello ${escapeHtml(user.name)},</p>
        <p>Use the button below to choose a new Brightloop password. The link expires in ${env.resetTokenTtlMinutes} minutes.</p>
        <p style="margin:28px 0">
          <a href="${escapeHtml(resetUrl)}" style="background:#257beb;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Reset password</a>
        </p>
        <p style="font-size:13px;color:#64748b">If you did not request this, you can ignore this email.</p>
      </div>
    `,
  });
}

export async function sendDocumentEmail({
  to,
  customerName,
  subject,
  message,
  attachment,
  documentLabel,
}) {
  return sendMail({
    to,
    subject,
    text: `Hello ${customerName},\n\n${message}\n\nPlease find the ${documentLabel} attached.\n\nBrightloop Software`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
        <h2 style="margin-bottom:8px">${escapeHtml(subject)}</h2>
        <p>Hello ${escapeHtml(customerName)},</p>
        <p>${escapeHtml(message)}</p>
        <p>Please find the ${escapeHtml(documentLabel)} attached to this email.</p>
        <p style="margin-top:28px;color:#64748b;font-size:13px">Brightloop Software</p>
      </div>
    `,
    attachments: [attachment],
  });
}
