import { describe, expect, it } from "vitest";

import type { Queryable } from "../../src/db/client";
import {
  consumePasskeyChallenge,
  findPasskeyCredentialById,
  insertPasskeyChallenge,
  insertPasskeyCredential,
  listPasskeyCredentialsForUser,
  purgeExpiredPasskeyChallenges,
  recordPasskeyUsage,
  type PasskeyChallengeRow,
  type PasskeyCredentialRow
} from "../../src/foundation/passkey-credentials";

function makeFakeDb() {
  const credentials: PasskeyCredentialRow[] = [];
  const challenges: PasskeyChallengeRow[] = [];
  let seq = 0;
  const nextId = (): string => `row_${++seq}`;

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const sql = text.toLowerCase();
      if (sql.includes("insert into passkey_credentials")) {
        const row: PasskeyCredentialRow = {
          id: nextId(),
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
      if (sql.includes("delete from passkey_credentials")) {
        const idx = credentials.findIndex(
          (r) => r.credentialId === values[0] && r.userIdentityId === values[1]
        );
        if (idx >= 0) {
          credentials.splice(idx, 1);
          return { rows: [{ id: "removed" } as unknown as T] };
        }
        return { rows: [] };
      }
      if (sql.includes("insert into passkey_challenges")) {
        const row: PasskeyChallengeRow = {
          id: nextId(),
          userIdentityId: (values[0] as string | null) ?? null,
          challenge: values[1] as string,
          purpose: values[2] as "registration" | "authentication",
          createdAt: new Date().toISOString(),
          expiresAt: values[3] as string
        };
        challenges.push(row);
        return { rows: [row as unknown as T] };
      }
      if (sql.includes("delete from passkey_challenges") && sql.includes("returning")
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
      if (sql.includes("delete from passkey_challenges where expires_at <=")) {
        const before = challenges.length;
        const cutoff = values[0] as string;
        for (let i = challenges.length - 1; i >= 0; i--) {
          if (challenges[i]!.expiresAt <= cutoff) challenges.splice(i, 1);
        }
        const removed = before - challenges.length;
        return { rows: Array(removed).fill({ id: "x" }) as unknown as T[] };
      }
      throw new Error(`unexpected query: ${text}`);
    }
  };
  return { db, credentials, challenges };
}

describe("passkey-credentials repository", () => {
  it("inserts and reads back a credential by credentialId", async () => {
    const { db } = makeFakeDb();
    const inserted = await insertPasskeyCredential(db, {
      userIdentityId: "uid_1",
      credentialId: "cred_abc",
      publicKeyCose: "pk_xyz",
      signCount: 0,
      transports: ["internal"],
      aaguid: null,
      label: "Phone",
      backedUp: false,
      deviceType: "singleDevice"
    });
    expect(inserted.credentialId).toBe("cred_abc");
    const found = await findPasskeyCredentialById(db, "cred_abc");
    expect(found?.label).toBe("Phone");
  });

  it("lists all credentials for a user", async () => {
    const { db } = makeFakeDb();
    await insertPasskeyCredential(db, {
      userIdentityId: "uid_1", credentialId: "a", publicKeyCose: "pk", signCount: 0,
      transports: [], aaguid: null, label: "A", backedUp: false, deviceType: "singleDevice"
    });
    await insertPasskeyCredential(db, {
      userIdentityId: "uid_1", credentialId: "b", publicKeyCose: "pk", signCount: 0,
      transports: [], aaguid: null, label: "B", backedUp: true, deviceType: "multiDevice"
    });
    await insertPasskeyCredential(db, {
      userIdentityId: "uid_2", credentialId: "c", publicKeyCose: "pk", signCount: 0,
      transports: [], aaguid: null, label: "C", backedUp: false, deviceType: "singleDevice"
    });
    const list = await listPasskeyCredentialsForUser(db, "uid_1");
    expect(list.map((c) => c.credentialId).sort()).toEqual(["a", "b"]);
  });

  it("records sign-count usage", async () => {
    const { db } = makeFakeDb();
    await insertPasskeyCredential(db, {
      userIdentityId: "uid_1", credentialId: "cred", publicKeyCose: "pk", signCount: 1,
      transports: [], aaguid: null, label: "X", backedUp: false, deviceType: "singleDevice"
    });
    await recordPasskeyUsage(db, "cred", 5, "2026-05-15T12:00:00.000Z");
    const after = await findPasskeyCredentialById(db, "cred");
    expect(after?.signCount).toBe(5);
    expect(after?.lastUsedAt).toBe("2026-05-15T12:00:00.000Z");
  });

  it("consumes a challenge exactly once (replay protection)", async () => {
    const { db } = makeFakeDb();
    const futureExp = new Date(Date.now() + 60_000).toISOString();
    await insertPasskeyChallenge(db, {
      userIdentityId: "uid_1",
      challenge: "ch_abc",
      purpose: "registration",
      expiresAt: futureExp
    });
    const now = new Date().toISOString();
    const first = await consumePasskeyChallenge(db, "ch_abc", "registration", now);
    expect(first?.challenge).toBe("ch_abc");
    const second = await consumePasskeyChallenge(db, "ch_abc", "registration", now);
    expect(second).toBeNull();
  });

  it("rejects an expired challenge", async () => {
    const { db } = makeFakeDb();
    const pastExp = new Date(Date.now() - 60_000).toISOString();
    await insertPasskeyChallenge(db, {
      userIdentityId: null,
      challenge: "ch_old",
      purpose: "authentication",
      expiresAt: pastExp
    });
    const result = await consumePasskeyChallenge(db, "ch_old", "authentication", new Date().toISOString());
    expect(result).toBeNull();
  });

  it("purges expired challenges", async () => {
    const { db } = makeFakeDb();
    await insertPasskeyChallenge(db, {
      userIdentityId: null, challenge: "old", purpose: "authentication",
      expiresAt: new Date(Date.now() - 60_000).toISOString()
    });
    await insertPasskeyChallenge(db, {
      userIdentityId: null, challenge: "new", purpose: "authentication",
      expiresAt: new Date(Date.now() + 60_000).toISOString()
    });
    const purged = await purgeExpiredPasskeyChallenges(db, new Date().toISOString());
    expect(purged).toBe(1);
  });
});
