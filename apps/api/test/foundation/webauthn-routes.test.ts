import { Buffer } from "node:buffer";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  generateRegistrationOptions: vi.fn(),
  verifyRegistrationResponse: vi.fn(),
  generateAuthenticationOptions: vi.fn(),
  verifyAuthenticationResponse: vi.fn()
}));

vi.mock("@simplewebauthn/server", () => mocks);

import type { IdentityProvider, OrganizationMember, UserIdentity } from "@sentropic/openerp-domain";

import type { Queryable } from "../../src/db/client";
import { buildApp, headerTenantResolver } from "../../src/http/app";
import { createPasskeyService } from "../../src/foundation/passkey-service";

function clientDataJSON(challenge: string): string {
  return Buffer.from(
    JSON.stringify({ type: "webauthn.get", challenge, origin: "https://app.test" })
  ).toString("base64url");
}

function userIdentity(): UserIdentity {
  return {
    id: "uid_1",
    email: "alice@example.test",
    displayName: "Alice",
    preferredLocale: "fr",
    mfaState: "passkey",
    status: "active",
    actorType: "human",
    lastLoginAt: null,
    createdAt: "2026-05-15T00:00:00.000Z",
    updatedAt: "2026-05-15T00:00:00.000Z"
  } as UserIdentity;
}

function makeFakeDb(initialMembers: OrganizationMember[] = []) {
  const users: UserIdentity[] = [userIdentity()];
  const members = [...initialMembers];
  const credentials: Array<{
    id: string; user_identity_id: string; credential_id: string; public_key_cose: string;
    sign_count: number; transports: string[]; aaguid: string | null; label: string;
    backed_up: boolean; device_type: string; created_at: string; last_used_at: string | null;
  }> = [];
  const challenges: Array<{
    id: string; user_identity_id: string | null; challenge: string;
    purpose: "registration" | "authentication"; expires_at: string;
  }> = [];

  let seq = 0;
  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const sql = text.toLowerCase();
      // user_identities lookups
      if (sql.includes("from user_identities") && sql.includes("where lower(email)")) {
        const found = users.find((u) => u.email.toLowerCase() === (values[0] as string).toLowerCase());
        return { rows: found ? [found as unknown as T] : [] };
      }
      if (sql.includes("from user_identities") && sql.includes("where id =")) {
        const found = users.find((u) => u.id === values[0]);
        return { rows: found ? [found as unknown as T] : [] };
      }
      if (sql.includes("update user_identities")) {
        const u = users.find((x) => x.id === values[0]);
        if (u) (u as { lastLoginAt: string }).lastLoginAt = values[1] as string;
        return { rows: u ? [u as unknown as T] : [] };
      }
      // active memberships via SECURITY DEFINER fn
      if (sql.includes("from list_active_memberships_for_user")) {
        return {
          rows: members.filter((m) => m.userIdentityId === values[0]) as unknown as T[]
        };
      }
      // passkey credentials
      if (sql.includes("insert into passkey_credentials")) {
        const row = {
          id: `cred_${++seq}`,
          user_identity_id: values[0] as string,
          credential_id: values[1] as string,
          public_key_cose: values[2] as string,
          sign_count: values[3] as number,
          transports: (values[4] as string[]) ?? [],
          aaguid: (values[5] as string | null) ?? null,
          label: values[6] as string,
          backed_up: values[7] as boolean,
          device_type: values[8] as string,
          created_at: new Date().toISOString(),
          last_used_at: null
        };
        credentials.push(row);
        return {
          rows: [{
            id: row.id, userIdentityId: row.user_identity_id, credentialId: row.credential_id,
            publicKeyCose: row.public_key_cose, signCount: row.sign_count, transports: row.transports,
            aaguid: row.aaguid, label: row.label, backedUp: row.backed_up, deviceType: row.device_type,
            createdAt: row.created_at, lastUsedAt: row.last_used_at
          } as unknown as T]
        };
      }
      if (sql.includes("from passkey_credentials") && sql.includes("where credential_id =")) {
        const row = credentials.find((c) => c.credential_id === values[0]);
        if (!row) return { rows: [] };
        return {
          rows: [{
            id: row.id, userIdentityId: row.user_identity_id, credentialId: row.credential_id,
            publicKeyCose: row.public_key_cose, signCount: row.sign_count, transports: row.transports,
            aaguid: row.aaguid, label: row.label, backedUp: row.backed_up, deviceType: row.device_type,
            createdAt: row.created_at, lastUsedAt: row.last_used_at
          } as unknown as T]
        };
      }
      if (sql.includes("from passkey_credentials") && sql.includes("where user_identity_id =")) {
        return {
          rows: credentials
            .filter((c) => c.user_identity_id === values[0])
            .map((row) => ({
              id: row.id, userIdentityId: row.user_identity_id, credentialId: row.credential_id,
              publicKeyCose: row.public_key_cose, signCount: row.sign_count, transports: row.transports,
              aaguid: row.aaguid, label: row.label, backedUp: row.backed_up, deviceType: row.device_type,
              createdAt: row.created_at, lastUsedAt: row.last_used_at
            })) as unknown as T[]
        };
      }
      if (sql.includes("update passkey_credentials")) {
        const c = credentials.find((x) => x.credential_id === values[0]);
        if (c) {
          c.sign_count = values[1] as number;
          c.last_used_at = values[2] as string;
        }
        return { rows: [] };
      }
      if (sql.includes("insert into passkey_challenges")) {
        challenges.push({
          id: `ch_${++seq}`,
          user_identity_id: (values[0] as string | null) ?? null,
          challenge: values[1] as string,
          purpose: values[2] as "registration" | "authentication",
          expires_at: values[3] as string
        });
        return { rows: [{}] as unknown as T[] };
      }
      if (sql.includes("delete from passkey_challenges") && sql.includes("where challenge =")) {
        const idx = challenges.findIndex(
          (c) =>
            c.challenge === values[0] && c.purpose === values[1] && c.expires_at > (values[2] as string)
        );
        if (idx >= 0) {
          const [r] = challenges.splice(idx, 1);
          return {
            rows: [{
              id: r!.id, userIdentityId: r!.user_identity_id, challenge: r!.challenge,
              purpose: r!.purpose, expiresAt: r!.expires_at, createdAt: new Date().toISOString()
            } as unknown as T]
          };
        }
        return { rows: [] };
      }
      throw new Error(`unexpected query: ${text}`);
    }
  };
  return { db, users, members, credentials };
}

function fakeIdentityProvider(): IdentityProvider {
  return {
    async verify() { throw new Error("not used"); },
    async issueHumanSession(identity, member, ttlSeconds) {
      const now = new Date();
      return {
        raw: `jwt.${identity.id}.${member.organizationId}`,
        subjectUserIdentityId: identity.id,
        actingForUserIdentityId: null,
        actorType: "human",
        organizationId: member.organizationId,
        scopes: ["session"],
        issuedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + ttlSeconds * 1000).toISOString(),
        policyDecisionId: null,
        approvalRequestId: null
      };
    },
    async exchangeForAgentToken() { throw new Error("not used"); },
    async revoke() { /* no-op */ }
  };
}

const ORIGIN = "https://app.test";
const RPID = "app.test";

function buildAppWithPasskey(deps?: { members?: OrganizationMember[] }) {
  const { db, credentials, members } = makeFakeDb(deps?.members ?? []);
  const passkeyService = createPasskeyService({ rpName: "OpenERP", rpID: RPID, expectedOrigin: ORIGIN });
  const app = buildApp({
    db,
    resolveTenant: headerTenantResolver,
    passkey: { service: passkeyService, identityProvider: fakeIdentityProvider() }
  });
  return { app, db, credentials, members };
}

describe("HTTP /webauthn routes", () => {
  beforeEach(() => {
    mocks.generateRegistrationOptions.mockReset();
    mocks.verifyRegistrationResponse.mockReset();
    mocks.generateAuthenticationOptions.mockReset();
    mocks.verifyAuthenticationResponse.mockReset();
  });

  it("is reachable without tenant headers (public route)", async () => {
    const { app } = buildAppWithPasskey();
    mocks.generateAuthenticationOptions.mockResolvedValueOnce({ challenge: "ch_open" });
    const res = await app.request("/webauthn/login/begin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}"
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { challenge: string };
    expect(body.challenge).toBe("ch_open");
  });

  it("registers a passkey: begin then finish", async () => {
    const { app, credentials } = buildAppWithPasskey();
    mocks.generateRegistrationOptions.mockResolvedValueOnce({ challenge: "ch_r1" });
    mocks.verifyRegistrationResponse.mockResolvedValueOnce({
      verified: true,
      registrationInfo: {
        credential: { id: "cred_new", publicKey: new Uint8Array([1, 2]), counter: 0 },
        credentialDeviceType: "multiDevice",
        credentialBackedUp: true,
        aaguid: "00000000-0000-0000-0000-000000000000"
      }
    });

    const begin = await app.request("/webauthn/register/begin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "alice@example.test" })
    });
    expect(begin.status).toBe(200);
    const beginBody = (await begin.json()) as { challenge: string };
    expect(beginBody.challenge).toBe("ch_r1");

    const finish = await app.request("/webauthn/register/finish", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userIdentityId: "uid_1",
        response: {
          id: "cred_new",
          rawId: "cred_new",
          type: "public-key",
          response: { clientDataJSON: clientDataJSON("ch_r1") }
        },
        label: "Laptop"
      })
    });
    expect(finish.status).toBe(201);
    expect(credentials).toHaveLength(1);
  });

  it("logs in with a single active membership and mints a session", async () => {
    const member: OrganizationMember = {
      id: "om_1",
      userIdentityId: "uid_1",
      organizationId: "org_alpha",
      status: "active",
      preferredLocale: "fr",
      joinedAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    };
    const { app, db } = buildAppWithPasskey({ members: [member] });

    // Seed an existing credential directly via the repository so login has something to match.
    await db.query(
      `insert into passkey_credentials (
         user_identity_id, credential_id, public_key_cose, sign_count,
         transports, aaguid, label, backed_up, device_type
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *`,
      ["uid_1", "cred_existing", "pk", 0, [], null, "X", false, "singleDevice"]
    );

    mocks.generateAuthenticationOptions.mockResolvedValueOnce({ challenge: "ch_a1" });
    mocks.verifyAuthenticationResponse.mockResolvedValueOnce({
      verified: true,
      authenticationInfo: { newCounter: 3 }
    });

    await app.request("/webauthn/login/begin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "alice@example.test" })
    });
    const finish = await app.request("/webauthn/login/finish", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        response: {
          id: "cred_existing",
          rawId: "cred_existing",
          type: "public-key",
          response: { clientDataJSON: clientDataJSON("ch_a1") }
        }
      })
    });
    expect(finish.status).toBe(200);
    const body = (await finish.json()) as { organizationId: string; token: { raw: string } };
    expect(body.organizationId).toBe("org_alpha");
    expect(body.token.raw).toMatch(/^jwt\.uid_1\.org_alpha$/);
  });

  it("returns 409 ORGANIZATION_SELECTION_REQUIRED when the user belongs to multiple orgs", async () => {
    const members: OrganizationMember[] = [
      {
        id: "om_a", userIdentityId: "uid_1", organizationId: "org_alpha", status: "active",
        preferredLocale: null, joinedAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z"
      },
      {
        id: "om_b", userIdentityId: "uid_1", organizationId: "org_beta", status: "active",
        preferredLocale: null, joinedAt: "2026-01-02T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z"
      }
    ];
    const { app, db } = buildAppWithPasskey({ members });
    await db.query(
      `insert into passkey_credentials (
         user_identity_id, credential_id, public_key_cose, sign_count,
         transports, aaguid, label, backed_up, device_type
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *`,
      ["uid_1", "cred_multi", "pk", 0, [], null, "X", false, "singleDevice"]
    );

    mocks.generateAuthenticationOptions.mockResolvedValueOnce({ challenge: "ch_multi" });
    mocks.verifyAuthenticationResponse.mockResolvedValueOnce({
      verified: true,
      authenticationInfo: { newCounter: 1 }
    });

    await app.request("/webauthn/login/begin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "alice@example.test" })
    });
    const res = await app.request("/webauthn/login/finish", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        response: {
          id: "cred_multi",
          rawId: "cred_multi",
          type: "public-key",
          response: { clientDataJSON: clientDataJSON("ch_multi") }
        }
      })
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { code: string; memberships: { organizationId: string }[] };
    expect(body.code).toBe("ORGANIZATION_SELECTION_REQUIRED");
    expect(body.memberships.map((m) => m.organizationId).sort()).toEqual(["org_alpha", "org_beta"]);
  });
});
