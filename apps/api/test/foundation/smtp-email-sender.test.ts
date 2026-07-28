import { describe, expect, it, vi } from "vitest";

const { createTransport, sendMail } = vi.hoisted(() => ({
  createTransport: vi.fn(),
  sendMail: vi.fn(),
}));

vi.mock("nodemailer", () => ({
  default: { createTransport },
}));

import { createSmtpEmailSender } from "../../src/foundation/smtp-email-sender";

describe("SMTP email sender", () => {
  it("fails closed for incomplete transport configuration", () => {
    expect(() => createSmtpEmailSender({
      host: "",
      port: 587,
      secure: false,
      fromAddress: "auth@example.test",
    })).toThrow("OPENERP_SMTP_HOST");
    expect(() => createSmtpEmailSender({
      host: "smtp.example.test",
      port: 587,
      secure: false,
      fromAddress: "",
    })).toThrow("OPENERP_SMTP_FROM_ADDRESS");
  });

  it("delivers the message through the configured SMTP transport", async () => {
    createTransport.mockReturnValue({ sendMail });
    sendMail.mockResolvedValue({ messageId: "smtp-message-1" });
    const sender = createSmtpEmailSender({
      host: "smtp.example.test",
      port: 587,
      secure: false,
      fromAddress: "OpenERP Auth <auth@example.test>",
      user: "smtp-user",
      password: "smtp-password",
    });

    await expect(sender.send({
      toAddress: "alice@example.test",
      subject: "Your code",
      kind: "auth_email_verification",
      body: "482910",
    })).resolves.toEqual({ providerId: "smtp-message-1" });
    expect(createTransport).toHaveBeenCalledWith({
      host: "smtp.example.test",
      port: 587,
      secure: false,
      auth: { user: "smtp-user", pass: "smtp-password" },
    });
    expect(sendMail).toHaveBeenCalledWith({
      from: "OpenERP Auth <auth@example.test>",
      to: "alice@example.test",
      subject: "Your code",
      text: "482910",
    });
  });
});
