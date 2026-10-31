import nodemailer from 'nodemailer';
import env from './env.js';

const hasSmtpConfiguration = Boolean(env.mail.host);

const transporter = hasSmtpConfiguration
  ? nodemailer.createTransport({
      host: env.mail.host,
      port: env.mail.port,
      secure: env.mail.secure,
      auth:
        env.mail.user || env.mail.pass
          ? { user: env.mail.user, pass: env.mail.pass }
          : undefined,
    })
  : nodemailer.createTransport({ jsonTransport: true });

export const mailMode = hasSmtpConfiguration ? 'smtp' : 'json';

export async function sendMail({ to, subject, text, html, attachments }) {
  const info = await transporter.sendMail({
    from: env.mail.from,
    to,
    subject,
    text,
    html,
    attachments,
  });

  if (!hasSmtpConfiguration) {
    console.log(`[mail:preview] ${subject} -> ${to}`);
    console.log(info.message.toString());
  }

  return {
    messageId: info.messageId,
    mode: mailMode,
  };
}
