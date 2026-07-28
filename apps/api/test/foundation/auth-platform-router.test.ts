import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";

import type { OrganizationMember } from "@sentropic/openerp-domain";

import type { ApiEnv } from "../../src/config/env";
import type { Queryable } from "../../src/db/client";
import type { EmailSender } from "../../src/foundation/email-sender";
import { createIdentityProvider } from "../../src/foundation/identity-provider";
import { buildApp, headerTenantResolver } from "../../src/http/app";
import type { PlatformAuthWebAuthnVerifierOverrides } from "../../src/auth/router";

const SESSION_SECRET = new TextEncoder().encode("openerp-platform-router-test-secret-32b");
const IDENTITY = {
  id: "invited-user-1",
  email: "invitee@example.test",
  display_name: "Invited User",
  actor_type: "human",
  status: "invited",
  email_verified: false,
  created_at: new Date("2026-07-28T12:00:00.000Z"),
  updated_at: new Date("2026-07-28T12:00:00.000Z"),
};

const AUTH_ENV: ApiEnv = {
  databaseUrl: "postgresql://openerp.test/auth-platform-router",
  platformAuthEnabled: true,
  sessionSecret: "openerp-platform-router-test-secret-32b",
  sessionIssuer: "openerp-platform-router-test",
  sessionAudience: undefined,
  appVersion: "test",
  oauthIssuerUrl: undefined,
  oauthClientId: undefined,
  oauthClientSecret: undefined,
  oauthRedirectUri: undefined,
  smtpHost: undefined,
  smtpPort: undefined,
  smtpSecure: undefined,
  smtpUser: undefined,
  smtpPassword: undefined,
  smtpFromAddress: undefined,
};

const emailSender: EmailSender = {
  id: "auth-platform-router-test",
  async send() {
    return { providerId: "auth-platform-router-test" };
  },
};

function activeMember(): OrganizationMember {
  return {
    id: "membership-1",
    userIdentityId: IDENTITY.id,
    organizationId: "organization-1",
    status: "active",
    preferredLocale: "en",
    joinedAt: "2026-07-28T12:00:00.000Z",
    updatedAt: "2026-07-28T12:00:00.000Z",
  };
}

interface CredentialRow {
  id: string;
  user_identity_id: string;
  credential_id: string;
  public_key_cose: string;
  sign_count: number;
  transports: string[];
  label: string;
  backed_up: boolean;
  device_type: string;
  created_at: Date;
  last_used_at: Date | null;
}

interface SessionRow {
  id: string;
  user_identity_id: string;
  organization_id: string;
  session_token_hash: string;
  refresh_token_hash: string | null;
  device_name: string | null;
  ip_address: string | null;
  user_agent: string | null;
  mfa_verified: boolean;
  expires_at: Date;
  created_at: Date;
  last_activity_at: Date;
  revoked_at: Date | null;
}

function buildPlatformApp(options: {
  credentials?: CredentialRow[];
  identity?: typeof IDENTITY | null;
  memberships?: OrganizationMember[];
  membershipSequence?: OrganizationMember[][];
  webAuthn?: PlatformAuthWebAuthnVerifierOverrides;
} = {}) {
  const identity = options.identity === undefined ? IDENTITY : options.identity;
  const memberships = options.memberships ?? [activeMember()];
  const credentials = [...(options.credentials ?? [])];
  const sessions: SessionRow[] = [];
  const challenges: Array<{
    id: string;
    challenge: string;
    user_identity_id: string | null;
    purpose: "authentication" | "registration";
    expires_at: Date;
    created_at: Date;
  }> = [];
  let challengeId = 0;
  let credentialId = 0;
  let membershipQueryCount = 0;
  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const sql = text.toLowerCase();
      if (sql.includes("from user_identities") && sql.includes("where lower(email)")) {
        const requested = String(values[0]).toLowerCase();
        return {
          rows: identity && identity.email.toLowerCase() === requested
            ? [identity as unknown as T]
            : [],
        };
      }
      if (sql.includes("from user_identities") && sql.includes("where id =")) {
        return { rows: identity && identity.id === values[0] ? [identity as unknown as T] : [] };
      }
      if (sql.includes("update user_identities")) {
        return {
          rows: identity ? [{ ...identity, email_verified: true } as unknown as T] : [],
        };
      }
      if (sql.includes("from list_active_memberships_for_user")) {
        const currentMemberships = options.membershipSequence?.[membershipQueryCount++] ?? memberships;
        return {
          rows: currentMemberships
            .filter((member) => member.userIdentityId === values[0]) as unknown as T[],
        };
      }
      if (sql.includes("auth_email_verification_verify_token")) {
        return { rows: [{ verified: values[1] === "verified-token" } as unknown as T] };
      }
      if (sql.includes("insert into passkey_challenges")) {
        const challenge = {
          id: `challenge-${++challengeId}`,
          user_identity_id: values[0] as string | null,
          challenge: values[1] as string,
          purpose: values[2] as "authentication" | "registration",
          expires_at: values[3] as Date,
          created_at: new Date(),
        };
        challenges.push(challenge);
        return { rows: [challenge as unknown as T] };
      }
      if (sql.startsWith("select") && sql.includes("from passkey_challenges") && sql.includes("where challenge")) {
        const challenge = challenges.find(
          (candidate) => candidate.challenge === values[0] && candidate.purpose === values[1]
        );
        return { rows: challenge ? [challenge as unknown as T] : [] };
      }
      if (sql.includes("insert into passkey_credentials")) {
        const credential: CredentialRow = {
          id: `credential-${++credentialId}`,
          user_identity_id: values[0] as string,
          credential_id: values[1] as string,
          public_key_cose: values[2] as string,
          sign_count: values[3] as number,
          transports: values[4] as string[],
          label: values[5] as string,
          backed_up: values[6] as boolean,
          device_type: values[7] as string,
          created_at: new Date(),
          last_used_at: null,
        };
        credentials.push(credential);
        return { rows: [credential as unknown as T] };
      }
      if (sql.includes("from passkey_credentials") && sql.includes("where credential_id")) {
        const credential = credentials.find((candidate) => candidate.credential_id === values[0]);
        return { rows: credential ? [credential as unknown as T] : [] };
      }
      if (sql.includes("from passkey_credentials") && sql.includes("where user_identity_id")) {
        return {
          rows: credentials
            .filter((candidate) => candidate.user_identity_id === values[0]) as unknown as T[],
        };
      }
      if (sql.includes("update passkey_credentials") && sql.includes("set sign_count")) {
        const credential = credentials.find((candidate) => candidate.credential_id === values[0]);
        if (credential) {
          credential.sign_count = Math.max(credential.sign_count, values[1] as number);
          credential.last_used_at = values[2] as Date | null;
        }
        return { rows: [] };
      }
      if (sql.includes("delete from passkey_challenges") && sql.includes("where challenge")) {
        const index = challenges.findIndex((challenge) => challenge.challenge === values[0]);
        if (index === -1) return { rows: [] };
        const [challenge] = challenges.splice(index, 1);
        return { rows: [{ id: challenge!.id } as unknown as T] };
      }
      if (sql.includes("insert into openerp_sessions")) {
        const session: SessionRow = {
          id: values[0] as string,
          user_identity_id: values[1] as string,
          organization_id: values[2] as string,
          session_token_hash: values[3] as string,
          refresh_token_hash: values[4] as string | null,
          device_name: values[5] as string | null,
          ip_address: values[6] as string | null,
          user_agent: values[7] as string | null,
          mfa_verified: values[8] as boolean,
          expires_at: values[9] as Date,
          created_at: values[10] as Date,
          last_activity_at: values[10] as Date,
          revoked_at: null,
        };
        sessions.push(session);
        return { rows: [session as unknown as T] };
      }
      if (sql.includes("from openerp_sessions") && sql.includes("where session_token_hash")) {
        const session = sessions.find((candidate) => candidate.session_token_hash === values[0]);
        return { rows: session ? [session as unknown as T] : [] };
      }
      if (sql.includes("update openerp_sessions") && sql.includes("set last_activity_at")) {
        return { rows: [] };
      }
      throw new Error(`Unexpected platform-auth query: ${text}`);
    },
  };
  const identityProvider = createIdentityProvider({
    secret: SESSION_SECRET,
    issuer: AUTH_ENV.sessionIssuer,
  });
  return {
    app: buildApp({
      db,
      resolveTenant: headerTenantResolver,
      platformAuth: {
        enabled: true,
        emailSender,
        env: AUTH_ENV,
        identityProvider,
        rp: { id: "app.example.test", expectedOrigin: "https://app.example.test" },
        sessionTtlSeconds: 3600,
        ...(options.webAuthn ? { webAuthn: options.webAuthn } : {}),
      },
    }),
    challenges,
    credentials,
    identityProvider,
  };
}

function clientDataJSON(challenge: string, type: "webauthn.create" | "webauthn.get"): string {
  return Buffer.from(JSON.stringify({ type, challenge, origin: "https://app.example.test" })).toString("base64url");
}

function activeIdentity() {
  return { ...IDENTITY, status: "active", email_verified: true };
}

describe("platform Hono auth dark mount", () => {
  it("returns 404 for every platform auth entry point while the default-off mount is absent", async () => {
    const app = buildApp({
      db: { query: async () => ({ rows: [] }) },
      resolveTenant: headerTenantResolver,
    });

    for (const request of [
      new Request("http://openerp.test/api/v1/auth/health"),
      new Request("http://openerp.test/api/v1/auth/session"),
      new Request("http://openerp.test/api/v1/auth/login/options", { method: "POST", body: "{}" }),
      new Request("http://openerp.test/api/v1/auth/register/options", { method: "POST", body: "{}" }),
    ]) {
      const response = await app.fetch(request);
      expect(response.status).toBe(404);
    }
  });

  it("mounts factory-backed health, session-info, and WebAuthn ceremony entry points when enabled", async () => {
    const { app, challenges } = buildPlatformApp();

    const health = await app.request("/api/v1/auth/health");
    expect(health.status).toBe(200);
    await expect(health.json()).resolves.toEqual({ status: "ok", service: "openerp-auth" });

    const session = await app.request("/api/v1/auth/session");
    expect(session.status).toBe(401);

    const loginOptions = await app.request("/api/v1/auth/login/options", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect(loginOptions.status).toBe(200);
    await expect(loginOptions.json()).resolves.toMatchObject({
      options: { challenge: expect.any(String), rpId: "app.example.test" },
    });
    expect(challenges).toHaveLength(1);
    expect(challenges[0]?.purpose).toBe("authentication");

    const registrationOptions = await app.request("/api/v1/auth/register/options", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: IDENTITY.email, verificationToken: "verified-token" }),
    });
    expect(registrationOptions.status).toBe(200);
    await expect(registrationOptions.json()).resolves.toMatchObject({
      userId: IDENTITY.id,
      options: { challenge: expect.any(String), rp: { id: "app.example.test", name: "OpenERP" } },
    });
    expect(challenges).toHaveLength(2);
    expect(challenges[1]?.purpose).toBe("registration");
  });

  it("refuses passkey registration without a pre-provisioned invited identity or membership", async () => {
    const unknown = buildPlatformApp({ identity: null });
    const unknownResponse = await unknown.app.request("/api/v1/auth/register/options", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "unknown@example.test", verificationToken: "verified-token" }),
    });
    expect(unknownResponse.status).toBe(403);
    await expect(unknownResponse.json()).resolves.toMatchObject({
      error: { code: "registration_not_preprovisioned" },
    });

    const noMembership = buildPlatformApp({ memberships: [] });
    const noMembershipResponse = await noMembership.app.request("/api/v1/auth/register/options", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: IDENTITY.email, verificationToken: "verified-token" }),
    });
    expect(noMembershipResponse.status).toBe(403);
    await expect(noMembershipResponse.json()).resolves.toMatchObject({
      error: { code: "registration_membership_required" },
    });
  });

  it("rechecks closed-registration policy before persistence so a revoked membership creates no credential", async () => {
    const initiallyActive = [activeMember()];
    const { app, challenges, credentials } = buildPlatformApp({
      membershipSequence: [initiallyActive, initiallyActive, []],
      webAuthn: {
        verifyRegistrationResponse: (async () => ({
          verified: true,
          registrationInfo: {
            credential: { id: "late-credential", publicKey: new Uint8Array([1, 2]), counter: 0 },
            credentialBackedUp: false,
            credentialDeviceType: "singleDevice",
          },
        })) as never,
      },
    });
    const optionsResponse = await app.request("/api/v1/auth/register/options", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: IDENTITY.email, verificationToken: "verified-token" }),
    });
    const optionsBody = (await optionsResponse.json()) as { options: { challenge: string } };
    expect(optionsResponse.status).toBe(200);
    expect(challenges).toHaveLength(1);

    const verifyResponse = await app.request("/api/v1/auth/register/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: IDENTITY.email,
        userId: IDENTITY.id,
        verificationToken: "verified-token",
        credential: {
          id: "late-credential",
          rawId: "late-credential",
          type: "public-key",
          response: {
            clientDataJSON: clientDataJSON(optionsBody.options.challenge, "webauthn.create"),
          },
        },
      }),
    });

    expect(verifyResponse.status).toBe(403);
    await expect(verifyResponse.json()).resolves.toMatchObject({
      error: { code: "registration_membership_required" },
    });
    expect(credentials).toHaveLength(0);
  });

  it("logs in a legacy credential through the composed router, updates its counter, and serves session info", async () => {
    const legacyCredential: CredentialRow = {
      id: "legacy-record-1",
      user_identity_id: IDENTITY.id,
      credential_id: "legacy-credential",
      public_key_cose: Buffer.from(new Uint8Array([1, 2, 3])).toString("base64url"),
      sign_count: 2,
      transports: ["internal"],
      label: "Legacy laptop",
      backed_up: false,
      device_type: "singleDevice",
      created_at: new Date("2026-07-28T12:00:00.000Z"),
      last_used_at: null,
    };
    const { app, credentials } = buildPlatformApp({
      identity: activeIdentity(),
      credentials: [legacyCredential],
      webAuthn: {
        verifyAuthenticationResponse: (async () => ({
          verified: true,
          authenticationInfo: { newCounter: 9, userVerified: true },
        })) as never,
      },
    });
    const optionsResponse = await app.request("/api/v1/auth/login/options", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: IDENTITY.email }),
    });
    const optionsBody = (await optionsResponse.json()) as { options: { challenge: string } };
    expect(optionsResponse.status).toBe(200);
    const loginResponse = await app.request("/api/v1/auth/login/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        credential: {
          id: legacyCredential.credential_id,
          rawId: legacyCredential.credential_id,
          type: "public-key",
          response: {
            clientDataJSON: clientDataJSON(optionsBody.options.challenge, "webauthn.get"),
          },
        },
      }),
    });
    expect(loginResponse.status).toBe(200);
    expect(credentials[0]?.sign_count).toBe(9);
    const cookies = loginResponse.headers.get("set-cookie") ?? "";
    const sessionToken = /(?:^|,\s*)openerp_session=([^;]+)/.exec(cookies)?.[1];
    expect(sessionToken).toBeTruthy();

    const sessionInfo = await app.request("/api/v1/auth/session", {
      headers: { cookie: `openerp_session=${sessionToken}` },
    });
    expect(sessionInfo.status).toBe(200);
    await expect(sessionInfo.json()).resolves.toMatchObject({
      organizationId: "organization-1",
      user: { id: IDENTITY.id, email: IDENTITY.email },
    });
  });

  it("keeps agent exchange mounted for a platform-only composition", async () => {
    const { app, identityProvider } = buildPlatformApp({ identity: activeIdentity() });
    const token = await identityProvider.issueHumanSession(
      {
        id: IDENTITY.id,
        email: IDENTITY.email,
        displayName: IDENTITY.display_name,
        preferredLocale: "en",
        mfaState: "passkey",
        status: "active",
        actorType: "human",
        lastLoginAt: null,
        createdAt: "2026-07-28T12:00:00.000Z",
        updatedAt: "2026-07-28T12:00:00.000Z",
      },
      activeMember(),
      3600
    );
    const response = await app.request("/auth/exchange-agent-token", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token.raw}`,
        "content-type": "application/json",
        "x-organization-id": "organization-1",
        "x-user-identity-id": IDENTITY.id,
      },
      body: "{}",
    });
    expect(response.status).toBe(200);
  });

  it("keeps disabled magic-link capability paths absent instead of exposing a throwing stub", async () => {
    const { app } = buildPlatformApp();
    for (const [method, path] of [
      ["POST", "/magic-link/request"],
      ["POST", "/magic-link/verify"],
      ["GET", "/oauth/authorize"],
      ["GET", "/.well-known/jwks.json"],
    ] as const) {
      const response = await app.request(`/api/v1/auth${path}`, { method });
      expect(response.status).toBe(404);
    }
  });
});
