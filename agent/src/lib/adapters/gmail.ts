import nodemailer, { type Transporter } from "nodemailer";
import { getEnv } from "../env";
import type { Mailer, OutgoingMail, HealthResult } from "../ports";

let transporter: Transporter | undefined;

function getTransport() {
  if (transporter) return transporter;
  const env = getEnv();
  transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: env.GMAIL_ADDRESS, pass: env.GMAIL_APP_PASSWORD },
    connectionTimeout: 15_000,
  });
  return transporter;
}

export const gmail: Mailer = {
  async send(mail: OutgoingMail) {
    const env = getEnv();
    const info = await getTransport().sendMail({
      from: { name: env.SENDER_NAME, address: env.GMAIL_ADDRESS },
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      inReplyTo: mail.inReplyTo,
      references: mail.references,
      attachments: mail.attachments,
    });
    return { messageId: info.messageId };
  },
  async health(): Promise<HealthResult> {
    try {
      await getTransport().verify();
      return { ok: true, detail: getEnv().GMAIL_ADDRESS };
    } catch (e) {
      return { ok: false, detail: e instanceof Error ? e.message.slice(0, 120) : "SMTP login failed" };
    }
  },
};
