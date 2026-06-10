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
import { createStubCredentialsPort } from "./stub-credentials-port.js";
import { createStubChallengesPort } from "./stub-challenges-port.js";
import { createStubEmailVerificationPort } from "./stub-email-verification-port.js";
import { createStubMagicLinksPort } from "./stub-magic-links-port.js";
import { createStubEmailDeliveryPort } from "./stub-email-delivery-port.js";
import { createStubOauthStateStorePort } from "./stub-oauth-state-store-port.js";
import { createStubJwksPort } from "./stub-jwks-port.js";

export {
  createOpenERPSessionPort,
  createOpenERPUserPort,
  createOpenERPCookiePort,
  createOpenERPTokenPort,
  createOpenERPAccountPolicyPort,
  createOpenERPAuditLogPort,
  createOpenERPClockPort,
  createOpenERPRandomPort,
  createStubCredentialsPort,
  createStubChallengesPort,
  createStubEmailVerificationPort,
  createStubMagicLinksPort,
  createStubEmailDeliveryPort,
  createStubOauthStateStorePort,
  createStubJwksPort,
};

export type { OpenERPSessionClaims, OpenERPTokenPortOptions } from "./openerp-token-port.js";

/**
 * Compose all AuthHonoPorts for OpenERP.
 *
 * Eight live adapters wrap existing OpenERP storage (user_identities,
 * openerp_sessions, cookies, audit_events, HS256 session signing).
 * Seven ports are stubbed with tagged throws because passkeys, OAuth-state,
 * and JWKS live at the Sentropic IdP in the RP-only model.
 *
 * No routes are mounted yet — A0-oidc-client + A0-handlers + A1 cutover
 * bring this bundle online.
 */
export function buildAuthHonoPorts(db: Queryable, env: ApiEnv): AuthHonoPorts {
  const secret = new TextEncoder().encode(env.sessionSecret);

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

    // Stubs — IdP-owned (AUTH-39-A RP-only model)
    credentials: createStubCredentialsPort(),
    challenges: createStubChallengesPort(),
    emailVerification: createStubEmailVerificationPort(),
    magicLinks: createStubMagicLinksPort(),
    emailDelivery: createStubEmailDeliveryPort(),
    oauthStateStore: createStubOauthStateStorePort(),
    jwks: createStubJwksPort(),
  };
}
