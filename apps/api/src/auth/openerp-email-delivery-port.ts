import { createHash } from "node:crypto";

import type { AuthHonoEmailDeliveryPort } from "@sentropic/auth-hono";
import type { Queryable } from "../db/client.js";
import {
  sendSystemEmail,
  type EmailSender,
} from "../foundation/email-sender.js";

export interface OpenERPEmailDeliveryPortOptions {
  db: Queryable;
  sender: EmailSender;
}

function verificationIdempotencyKey(email: string, code: string, expiresAt: Date): string {
  const digest = createHash("sha256")
    // A resend of the same generated code is idempotent, while two concurrent
    // requests that happen to share an expiry still deliver their distinct
    // codes. The journal retains only this digest, never the code itself.
    .update(`${email}\u0000${code}\u0000${expiresAt.toISOString()}`)
    .digest("hex");
  return `auth-email-verification:${digest}`;
}

export function createOpenERPEmailDeliveryPort(
  options: OpenERPEmailDeliveryPortOptions
): AuthHonoEmailDeliveryPort {
  return {
    async sendVerificationCode({ email, code, expiresAt }): Promise<void> {
      await sendSystemEmail(
        options.db,
        {
          toAddress: email,
          subject: "Your OpenERP verification code",
          kind: "auth_email_verification",
          resourceType: "auth_email_verification",
          body: `Your OpenERP verification code is ${code}. It expires at ${expiresAt.toISOString()}.`,
          idempotencyKey: verificationIdempotencyKey(email, code, expiresAt),
        },
        options.sender
      );
    },

    async sendMagicLink(): Promise<void> {
      // Deliberately disabled in this cut. No magic-link handler is mounted;
      // this fail-closed value only satisfies the monolithic platform port type.
      throw new Error("Magic-link delivery is disabled for OpenERP authentication.");
    },
  };
}
