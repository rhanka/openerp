import { describe, expect, it } from "vitest";
import type { UserIdentity } from "@sentropic/openerp-domain";
import type { Queryable } from "../../src/db/client";
import {
  findUserIdentityByEmail,
  findUserIdentityById,
  insertUserIdentity,
  recordUserIdentityLogin,
  setUserIdentityStatus
} from "../../src/foundation/user-identities";

function makeFakeDb() {
  const rows: UserIdentity[] = [];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;

      if (t.includes("insert into user_identities")) {
        const [email, displayName, preferredLocale, mfaState, status, actorType] = values as [
          string, string, "en" | "fr", "not_configured" | "passkey" | "totp",
          "invited" | "active" | "deactivated", "human" | "agent" | "system"
        ];
        const row: UserIdentity = {
          id: `uid_${rows.length + 1}`,
          email,
          displayName,
          preferredLocale,
          mfaState,
          status,
          actorType,
          lastLoginAt: null,
          createdAt: "2026-05-14T12:00:00.000Z",
          updatedAt: "2026-05-14T12:00:00.000Z"
        };
        rows.push(row);
        return { rows: [row as unknown as T] };
      }

      if (t.includes("from user_identities") && t.includes("where id = $1")) {
        const [id] = values as [string];
        const found = rows.find((r) => r.id === id);
        return { rows: found ? [found as unknown as T] : [] };
      }

      if (t.includes("from user_identities") && t.includes("lower(email)")) {
        const [email] = values as [string];
        const found = rows.find((r) => r.email.toLowerCase() === email.toLowerCase());
        return { rows: found ? [found as unknown as T] : [] };
      }

      if (t.includes("update user_identities") && t.includes("set status")) {
        const [id, status] = values as [string, "invited" | "active" | "deactivated"];
        const idx = rows.findIndex((r) => r.id === id);
        if (idx === -1) return { rows: [] };
        rows[idx] = { ...rows[idx]!, status };
        return { rows: [rows[idx]! as unknown as T] };
      }

      if (t.includes("update user_identities") && t.includes("set last_login_at")) {
        const [id, at] = values as [string, string];
        const idx = rows.findIndex((r) => r.id === id);
        if (idx === -1) return { rows: [] };
        rows[idx] = { ...rows[idx]!, lastLoginAt: at };
        return { rows: [rows[idx]! as unknown as T] };
      }

      return { rows: [] };
    }
  };

  return { db };
}

describe("UserIdentity repository (PG-02, global)", () => {
  it("inserts a new UserIdentity with lowercased email", async () => {
    const { db } = makeFakeDb();
    const created = await insertUserIdentity(db, {
      email: "Fabien@Example.com",
      displayName: "Fabien Antoine",
      preferredLocale: "fr",
      mfaState: "passkey",
      status: "active",
      actorType: "human"
    });
    expect(created.email).toBe("fabien@example.com");
    expect(created.actorType).toBe("human");
  });

  it("rejects emails without '@'", async () => {
    const { db } = makeFakeDb();
    await expect(
      insertUserIdentity(db, {
        email: "not-an-email",
        displayName: "x",
        preferredLocale: "en",
        mfaState: "not_configured",
        status: "invited",
        actorType: "human"
      })
    ).rejects.toThrow(/@/);
  });

  it("finds an identity by id or by email (case-insensitive)", async () => {
    const { db } = makeFakeDb();
    const created = await insertUserIdentity(db, {
      email: "alice@example.com",
      displayName: "Alice",
      preferredLocale: "en",
      mfaState: "passkey",
      status: "active",
      actorType: "human"
    });
    expect((await findUserIdentityById(db, created.id))?.email).toBe("alice@example.com");
    expect((await findUserIdentityByEmail(db, "ALICE@example.com"))?.id).toBe(created.id);
    expect(await findUserIdentityById(db, "uid_missing")).toBeNull();
    expect(await findUserIdentityByEmail(db, "nobody@x.com")).toBeNull();
  });

  it("transitions status and records login", async () => {
    const { db } = makeFakeDb();
    const created = await insertUserIdentity(db, {
      email: "bob@example.com",
      displayName: "Bob",
      preferredLocale: "en",
      mfaState: "passkey",
      status: "invited",
      actorType: "human"
    });
    const activated = await setUserIdentityStatus(db, created.id, "active");
    expect(activated?.status).toBe("active");
    const loggedIn = await recordUserIdentityLogin(db, created.id, "2026-05-14T15:00:00.000Z");
    expect(loggedIn?.lastLoginAt).toBe("2026-05-14T15:00:00.000Z");
  });
});
