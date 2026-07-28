import type {
  AuthHonoPorts,
  AuthHonoSessionPort,
  AuthHonoTokenPort,
  OauthStateStorePort,
} from "@sentropic/auth-hono";
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
import { createOpenERPPendingTenantSelectionPort } from "./openerp-pending-tenant-port.js";
import { createStubMagicLinksPort } from "./stub-magic-links-port.js";
import { createOpenERPEmailDeliveryPort } from "./openerp-email-delivery-port.js";
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
  createOpenERPPendingTenantSelectionPort,
  createStubMagicLinksPort,
  createOpenERPEmailDeliveryPort,
  createStubJwksPort,
};

export type { OpenERPSessionClaims, OpenERPTokenPort, OpenERPTokenPortOptions } from "./openerp-token-port.js";
export type {
  OpenERPCreateSessionInput,
  OpenERPSessionPort,
  OpenERPSessionRecord,
} from "./openerp-session-port.js";

/**
 * Compose all AuthHonoPorts for OpenERP.
 *
 * Twelve live adapters wrap OpenERP host policy, PostgreSQL persistence,
 * audited email delivery, cookie/session state, and signing. The two
 * deliberately disabled capabilities remain centralized and fail closed.
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
  const emailSender = options.emailSender ?? createLazyProductionEmailSender(env);

  return {
    // Live adapters
    // The platform's type does not expose organizationId. The concrete port
    // remains tenant-aware and rejects generic platform session creation; the
    // Lot 2 host session service is the only human-session issuer.
    sessions: createOpenERPSessionPort(db) as AuthHonoSessionPort,
    users: createOpenERPUserPort(db),
    cookies: createOpenERPCookiePort(),
    tokens: createOpenERPTokenPort({
      secret,
      issuer: env.sessionIssuer,
      ...(env.sessionAudience ? { audience: env.sessionAudience } : {}),
    }) as AuthHonoTokenPort,
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

    // Deliberately disabled capabilities. OpenERP mounts no OAuth provider
    // router; this required platform port therefore fails closed.
    magicLinks: createStubMagicLinksPort(),
    oauthStateStore: createDisabledOauthStateStore(),
    jwks: createStubJwksPort(),
  };
}

function createDisabledOauthStateStore(): OauthStateStorePort {
  const disabled = (): never => {
    throw new Error("OAuth provider capability is disabled");
  };

  return {
    findClient: disabled,
    saveAuthCode: disabled,
    consumeAuthCode: disabled,
    saveTokenMeta: disabled,
    findTokenMeta: disabled,
    revokeToken: disabled,
    isTokenRevoked: disabled,
    recordDpopJti: disabled,
    purgeExpired: disabled,
  };
}

/**
 * Authentication is mounted unconditionally, so building the SMTP transport
 * eagerly would stop an environment from booting merely because it has not
 * configured mail yet — and passkey sign-in needs no mail at all. Defer the
 * check to the first delivery, where it is actionable.
 */
function createLazyProductionEmailSender(env: ApiEnv): EmailSender {
  let delegate: EmailSender | undefined;
  const resolve = (): EmailSender => (delegate ??= createProductionEmailSender(env));
  return {
    get id(): string {
      return resolve().id;
    },
    send: (message) => resolve().send(message),
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
