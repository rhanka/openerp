import { Buffer } from "node:buffer";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock @simplewebauthn/server before the SUT is imported.
const mocks = vi.hoisted(() => ({
  generateRegistrationOptions: vi.fn(),
  verifyRegistrationResponse: vi.fn(),
  generateAuthenticationOptions: vi.fn(),
  verifyAuthenticationResponse: vi.fn()
}));

vi.mock("@simplewebauthn/server", () => mocks);

import type { UserIdentity } from "@sentropic/openerp-domain";

import type { Queryable } from "../../src/db/client";
import {
  insertPasskeyCredential,
  type PasskeyChallengeRow,
  type PasskeyCredentialRow
} from "../../src/foundation/passkey-credentials";
import {
  PasskeyError,
  createPasskeyService
} from "../../src/foundation/passkey-service";

function makeFakeDb() {
  const credentials: PasskeyCredentialRow[] = [];
  const challenges: PasskeyChallengeRow[] = [];
  let seq = 0;

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const sql = text.toLowerCase();
      if (sql.includes("insert into passkey_credentials")) {
        const row: PasskeyCredentialRow = {
          id: `cred_${++seq}`,
          userIdentityId: values[0] as string,
          credentialId: values[1] as string,
          publicKeyCose: values[2] as string,
          signCount: values[3] as number,
          transports: (values[4] as string[]) ?? [],
          aaguid: (values[5] as string | null) ?? null,
          label: values[6] as string,
          backedUp: values[7] as boolean,
          deviceType: values[8] as "singleDevice" | "multiDevice",
          createdAt: new Date().toISOString(),
          lastUsedAt: null
        };
        credentials.push(row);
        return { rows: [row as unknown as T] };
      }
      if (sql.includes("from passkey_credentials") && sql.includes("where credential_id =")) {
        const row = credentials.find((r) => r.credentialId === values[0]);
        return { rows: row ? [row as unknown as T] : [] };
      }
      if (sql.includes("from passkey_credentials") && sql.includes("where user_identity_id =")) {
        return { rows: credentials.filter((r) => r.userIdentityId === values[0]) as unknown as T[] };
      }
      if (sql.includes("update passkey_credentials")) {
        const row = credentials.find((r) => r.credentialId === values[0]);
        if (row) {
          row.signCount = values[1] as number;
          row.lastUsedAt = values[2] as string;
        }
        return { rows: [] };
      }
      if (sql.includes("insert into passkey_challenges")) {
        const row: PasskeyChallengeRow = {
          id: `ch_${++seq}`,
          userIdentityId: (values[0] as string | null) ?? null,
          challenge: values[1] as string,
          purpose: values[2] as "registration" | "authentication",
          createdAt: new Date().toISOString(),
          expiresAt: values[3] as string
        };
        challenges.push(row);
        return { rows: [row as unknown as T] };
      }
      if (sql.includes("delete from passkey_challenges")
          && sql.includes("where challenge =")) {
        const idx = challenges.findIndex(
          (r) =>
            r.challenge === values[0] && r.purpose === values[1] && r.expiresAt > (values[2] as string)
        );
        if (idx >= 0) {
          const [removed] = challenges.splice(idx, 1);
          return { rows: [removed as unknown as T] };
        }
        return { rows: [] };
      }
      throw new Error(`unexpected query: ${text}`);
    }
  };
  return { db, credentials, challenges };
}

function clientDataJSON(challenge: string): string {
  const json = JSON.stringify({ type: "webauthn.create", challenge, origin: "https://app.test" });
  return Buffer.from(json).toString("base64url");
}

function identity(overrides: Partial<UserIdentity> = {}): UserIdentity {
  return {
    id: "uid_1",
    email: "alice@example.test",
    displayName: "Alice",
    preferredLocale: "fr",
    mfaState: "not_configured",
    status: "active",
    actorType: "human",
    lastLoginAt: null,
    createdAt: "2026-05-15T00:00:00.000Z",
    updatedAt: "2026-05-15T00:00:00.000Z",
    ...overrides
  } as UserIdentity;
}

const SERVICE_OPTS = {
  rpName: "OpenERP",
  rpID: "app.test",
  expectedOrigin: "https://app.test"
};

describe("passkey-service", () => {
  beforeEach(() => {
    mocks.generateRegistrationOptions.mockReset();
    mocks.verifyRegistrationResponse.mockReset();
    mocks.generateAuthenticationOptions.mockReset();
    mocks.verifyAuthenticationResponse.mockReset();
  });

  it("begins registration, persists the challenge, then finishes successfully", async () => {
    const { db, credentials, challenges } = makeFakeDb();
    const svc = createPasskeyService(SERVICE_OPTS);
    mocks.generateRegistrationOptions.mockResolvedValueOnce({ challenge: "ch_reg_1", user: { id: "x" } });
    mocks.verifyRegistrationResponse.mockResolvedValueOnce({
      verified: true,
      registrationInfo: {
        credential: {
          id: "cred_new",
          publicKey: new Uint8Array([1, 2, 3]),
          counter: 0
        },
        credentialDeviceType: "singleDevice",
        credentialBackedUp: false,
        aaguid: "00000000-0000-0000-0000-000000000000"
      }
    });

    const opts = await svc.beginRegistration(db, { identity: identity() });
    expect(opts.challenge).toBe("ch_reg_1");
    expect(challenges).toHaveLength(1);

    const created = await svc.finishRegistration(db, {
      identity: identity(),
      response: {
        id: "cred_new",
        rawId: "cred_new",
        type: "public-key",
        response: { clientDataJSON: clientDataJSON("ch_reg_1") }
      } as never,
      label: "My laptop"
    });
    expect(created.credentialId).toBe("cred_new");
    expect(created.label).toBe("My laptop");
    expect(credentials).toHaveLength(1);
    expect(challenges).toHaveLength(0); // challenge consumed
  });

  it("rejects finishRegistration when the challenge is unknown or replayed", async () => {
    const { db } = makeFakeDb();
    const svc = createPasskeyService(SERVICE_OPTS);
    await expect(
      svc.finishRegistration(db, {
        identity: identity(),
        response: {
          id: "cred_x",
          rawId: "cred_x",
          type: "public-key",
          response: { clientDataJSON: clientDataJSON("never_seen") }
        } as never
      })
    ).rejects.toBeInstanceOf(PasskeyError);
  });

  it("rejects finishRegistration when the challenge was issued for a different user", async () => {
    const { db } = makeFakeDb();
    const svc = createPasskeyService(SERVICE_OPTS);
    mocks.generateRegistrationOptions.mockResolvedValueOnce({ challenge: "ch_reg_other", user: { id: "x" } });
    await svc.beginRegistration(db, { identity: identity({ id: "uid_other" }) });
    await expect(
      svc.finishRegistration(db, {
        identity: identity({ id: "uid_1" }),
        response: {
          id: "cred_x",
          rawId: "cred_x",
          type: "public-key",
          response: { clientDataJSON: clientDataJSON("ch_reg_other") }
        } as never
      })
    ).rejects.toMatchObject({ code: "PASSKEY_CHALLENGE_INVALID" });
  });

  it("authenticates and advances the sign count", async () => {
    const { db, credentials } = makeFakeDb();
    const svc = createPasskeyService(SERVICE_OPTS);
    await insertPasskeyCredential(db, {
      userIdentityId: "uid_1",
      credentialId: "cred_existing",
      publicKeyCose: Buffer.from([1, 2, 3]).toString("base64url"),
      signCount: 5,
      transports: ["internal"],
      aaguid: null,
      label: "Phone",
      backedUp: false,
      deviceType: "singleDevice"
    });
    mocks.generateAuthenticationOptions.mockResolvedValueOnce({ challenge: "ch_auth_1" });
    mocks.verifyAuthenticationResponse.mockResolvedValueOnce({
      verified: true,
      authenticationInfo: { newCounter: 9 }
    });

    await svc.beginAuthentication(db, { identity: identity() });

    const result = await svc.finishAuthentication(db, {
      id: "cred_existing",
      rawId: "cred_existing",
      type: "public-key",
      response: { clientDataJSON: clientDataJSON("ch_auth_1") }
    } as never);
    expect(result.userIdentityId).toBe("uid_1");
    expect(result.newSignCount).toBe(9);
    expect(credentials[0]?.signCount).toBe(9);
  });

  it("rejects authentication when the sign count does not advance (cloned authenticator)", async () => {
    const { db } = makeFakeDb();
    const svc = createPasskeyService(SERVICE_OPTS);
    await insertPasskeyCredential(db, {
      userIdentityId: "uid_1",
      credentialId: "cred_clone",
      publicKeyCose: "pk",
      signCount: 5,
      transports: [],
      aaguid: null,
      label: "X",
      backedUp: false,
      deviceType: "singleDevice"
    });
    mocks.generateAuthenticationOptions.mockResolvedValueOnce({ challenge: "ch_auth_clone" });
    mocks.verifyAuthenticationResponse.mockResolvedValueOnce({
      verified: true,
      authenticationInfo: { newCounter: 5 } // same as stored: replay/clone signal
    });

    await svc.beginAuthentication(db, { identity: identity() });
    await expect(
      svc.finishAuthentication(db, {
        id: "cred_clone",
        rawId: "cred_clone",
        type: "public-key",
        response: { clientDataJSON: clientDataJSON("ch_auth_clone") }
      } as never)
    ).rejects.toMatchObject({ code: "PASSKEY_COUNTER_REPLAY" });
  });

  it("rejects authentication when the underlying credential is unknown", async () => {
    const { db } = makeFakeDb();
    const svc = createPasskeyService(SERVICE_OPTS);
    mocks.generateAuthenticationOptions.mockResolvedValueOnce({ challenge: "ch_auth_unknown" });
    await svc.beginAuthentication(db, {});
    await expect(
      svc.finishAuthentication(db, {
        id: "cred_missing",
        rawId: "cred_missing",
        type: "public-key",
        response: { clientDataJSON: clientDataJSON("ch_auth_unknown") }
      } as never)
    ).rejects.toMatchObject({ code: "PASSKEY_CREDENTIAL_UNKNOWN" });
  });
});
