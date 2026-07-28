import type { AuthHonoPorts } from "@sentropic/auth-hono";
import type { Queryable } from "../db/client.js";
import type { ApiEnv } from "../config/env.js";
import { createOpenERPSessionPort } from "./openerp-session-port.js";
import { createOpenERPUserPort } from "./openerp-user-port.js";
import { createOpenERPCookiePort } from "./openerp-cookie-port.js";
import { createOpenERPTokenPort } from "./openerp-token-port.js";
import { createOpenERPAccountPolicyPort } from "./openerp-account-policy-port.js";
import { createOpenERPAuditLogPort } from "./openerp-audit-log-port.js";
import { createOpenERPClockPort } from "./openerp-clock-port.js";
import { createOpenERPRandomPort } from "./openerp-random-port.js";
import { createOpenERPCredentialPort } from "./openerp-credential-port.js";
import { createOpenERPChallengePort } from "./openerp-challenge-port.js";
import { createOpenERPEmailVerificationPort } from "./openerp-email-verification-port.js";
import { createStubMagicLinksPort } from "./stub-magic-links-port.js";
import { createOpenERPEmailDeliveryPort } from "./openerp-email-delivery-port.js";
import { createStubOauthStateStorePort } from "./stub-oauth-state-store-port.js";
import { createStubJwksPort } from "./stub-jwks-port.js";
import type { EmailSender } from "../foundation/email-sender.js";
import { createSmtpEmailSender } from "../foundation/smtp-email-sender.js";

export {
  createOpenERPSessionPort,
  createOpenERPUserPort,
  createOpenERPCookiePort,
  createOpenERPTokenPort,
  createOpenERPAccountPolicyPort,
  createOpenERPAuditLogPort,
  createOpenERPClockPort,
  createOpenERPRandomPort,
  createOpenERPCredentialPort,
  createOpenERPChallengePort,
  createOpenERPEmailVerificationPort,
  createStubMagicLinksPort,
  createOpenERPEmailDeliveryPort,
  createStubOauthStateStorePort,
  createStubJwksPort,
};

export type { OpenERPSessionClaims, OpenERPTokenPortOptions } from "./openerp-token-port.js";

/**
 * Compose all AuthHonoPorts for OpenERP.
 *
 * Twelve live adapters wrap OpenERP host policy, PostgreSQL persistence,
 * audited email delivery, cookie/session state, and signing. The three
 * deliberately disabled capabilities remain centralized and fail closed.
 *
 * No routes are mounted yet — A0-oidc-client + A0-handlers + A1 cutover
 * bring this bundle online.
 */
export interface BuildAuthHonoPortsOptions {
  /** Tests may supply a capturing transport. Production defaults to SMTP. */
  emailSender?: EmailSender;
}

export function buildAuthHonoPorts(
  db: Queryable,
  env: ApiEnv,
  options: BuildAuthHonoPortsOptions = {}
): AuthHonoPorts {
  const secret = new TextEncoder().encode(env.sessionSecret);
  const emailSender = options.emailSender ?? createProductionEmailSender(env);

  return {
    // Live adapters
    sessions: createOpenERPSessionPort(db),
    users: createOpenERPUserPort(db),
    cookies: createOpenERPCookiePort(),
    tokens: createOpenERPTokenPort({ secret }),
    accountPolicy: createOpenERPAccountPolicyPort(),
    auditLog: createOpenERPAuditLogPort(db),
    clock: createOpenERPClockPort(),
    random: createOpenERPRandomPort(),

    // Real core ports. They are prepared here but not traffic-reachable until
    // the later dark-router lot mounts composed handlers.
    credentials: createOpenERPCredentialPort(db),
    challenges: createOpenERPChallengePort(db),
    emailVerification: createOpenERPEmailVerificationPort(db),
    emailDelivery: createOpenERPEmailDeliveryPort({ db, sender: emailSender }),

    // Deliberately disabled capabilities. No Lot 0–1 route can invoke these.
    magicLinks: createStubMagicLinksPort(),
    oauthStateStore: createStubOauthStateStorePort(),
    jwks: createStubJwksPort(),
  };
}

function createProductionEmailSender(env: ApiEnv): EmailSender {
  if (!env.smtpHost || !env.smtpFromAddress) {
    throw new Error(
      "OPENERP_SMTP_HOST and OPENERP_SMTP_FROM_ADDRESS are required before platform auth email delivery can be composed"
    );
  }
  const port = env.smtpPort === undefined ? 587 : Number(env.smtpPort);
  const secure = env.smtpSecure === "true";
  return createSmtpEmailSender({
    host: env.smtpHost,
    port,
    secure,
    fromAddress: env.smtpFromAddress,
    user: env.smtpUser,
    password: env.smtpPassword,
  });
}
