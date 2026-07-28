import nodemailer from "nodemailer";

import type { EmailMessage, EmailSender } from "./email-sender.js";

export interface SmtpEmailSenderOptions {
  host: string;
  port: number;
  secure: boolean;
  fromAddress: string;
  user?: string | undefined;
  password?: string | undefined;
}

/**
 * Product SMTP transport for the auth delivery port. Configuration is supplied
 * at the API composition boundary; no development fallback can claim a mail
 * was delivered when it was not.
 */
export function createSmtpEmailSender(options: SmtpEmailSenderOptions): EmailSender {
  if (!options.host.trim()) throw new Error("OPENERP_SMTP_HOST is required for auth email delivery");
  if (!options.fromAddress.trim()) {
    throw new Error("OPENERP_SMTP_FROM_ADDRESS is required for auth email delivery");
  }
  if (!Number.isInteger(options.port) || options.port < 1 || options.port > 65_535) {
    throw new Error("OPENERP_SMTP_PORT must be a valid TCP port");
  }
  if ((options.user === undefined) !== (options.password === undefined)) {
    throw new Error("OPENERP_SMTP_USER and OPENERP_SMTP_PASSWORD must be configured together");
  }

  const transport = nodemailer.createTransport({
    host: options.host,
    port: options.port,
    secure: options.secure,
    auth: options.user === undefined ? undefined : { user: options.user, pass: options.password! },
  });

  return {
    id: "smtp",
    async send(message: EmailMessage) {
      const result = await transport.sendMail({
        from: options.fromAddress,
        to: message.toAddress,
        subject: message.subject,
        text: message.body,
      });
      return { providerId: result.messageId || "smtp" };
    },
  };
}
