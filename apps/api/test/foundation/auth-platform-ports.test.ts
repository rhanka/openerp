import { Buffer } from "node:buffer";

import { createAuthWebAuthnAuthenticationService } from "@sentropic/auth-hono/webauthn-authentication";
import type { AuthHonoChallengePort, AuthHonoPorts } from "@sentropic/auth-hono";
import { describe, expect, it, vi } from "vitest";

import { createOpenERPAuditLogPort } from "../../src/auth/openerp-audit-log-port";
import { createOpenERPChallengePort } from "../../src/auth/openerp-challenge-port";
import { createOpenERPCredentialPort } from "../../src/auth/openerp-credential-port";
import { createOpenERPEmailDeliveryPort } from "../../src/auth/openerp-email-delivery-port";
import { createOpenERPEmailVerificationPort } from "../../src/auth/openerp-email-verification-port";
import type { Queryable } from "../../src/db/client";
import type { EmailSender } from "../../src/foundation/email-sender";
import { insertPasskeyCredential } from "../../src/foundation/passkey-credentials";

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

function asLegacyCredential(row: CredentialRow) {
  return {
    id: row.id,
    userIdentityId: row.user_identity_id,
    credentialId: row.credential_id,
    publicKeyCose: row.public_key_cose,
    signCount: row.sign_count,
    transports: row.transports,
    aaguid: null,
    label: row.label,
    backedUp: row.backed_up,
    deviceType: row.device_type as "singleDevice" | "multiDevice",
    createdAt: row.created_at.toISOString(),
    lastUsedAt: row.last_used_at?.toISOString() ?? null,
  };
}

function makeCredentialDb() {
  const credentials: CredentialRow[] = [];
  let nextId = 0;
  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const sql = text.toLowerCase();
      if (sql.includes("insert into passkey_credentials")) {
        const isLegacyRepository = text.includes('as "userIdentityId"');
        const row: CredentialRow = {
          id: `credential-${++nextId}`,
          user_identity_id: values[0] as string,
          credential_id: values[1] as string,
          public_key_cose: values[2] as string,
          sign_count: values[3] as number,
          transports: (values[4] as string[]) ?? [],
          label: (isLegacyRepository ? values[6] : values[5]) as string,
          backed_up: (isLegacyRepository ? values[7] : values[6]) as boolean,
          device_type: (isLegacyRepository ? values[8] : values[7]) as string,
          created_at: new Date("2026-07-27T12:00:00.000Z"),
          last_used_at: null,
        };
        credentials.push(row);
        return {
          rows: [
            (isLegacyRepository ? asLegacyCredential(row) : row) as unknown as T,
          ],
        };
      }
      if (sql.startsWith("select") && sql.includes("from passkey_credentials") && sql.includes("where credential_id =")) {
        const row = credentials.find((candidate) => candidate.credential_id === values[0]);
        return { rows: row ? [row as unknown as T] : [] };
      }
      if (sql.startsWith("select") && sql.includes("from passkey_credentials") && sql.includes("where id =")) {
        const row = credentials.find((candidate) => candidate.id === values[0]);
        return { rows: row ? [row as unknown as T] : [] };
      }
      if (sql.startsWith("select") && sql.includes("from passkey_credentials") && sql.includes("where user_identity_id =")) {
        return {
          rows: credentials
            .filter((candidate) => candidate.user_identity_id === values[0])
            .map((row) => row as unknown as T),
        };
      }
      if (sql.includes("update passkey_credentials") && sql.includes("set sign_count")) {
        const row = credentials.find((candidate) => candidate.credential_id === values[0]);
        if (row) {
          row.sign_count = Math.max(row.sign_count, values[1] as number);
          const lastUsedAt = values[2] as Date | null;
          if (lastUsedAt && (!row.last_used_at || lastUsedAt > row.last_used_at)) {
            row.last_used_at = lastUsedAt;
          }
        }
        return { rows: [] };
      }
      if (sql.includes("update passkey_credentials") && sql.includes("set label")) {
        const row = credentials.find(
          (candidate) => candidate.id === values[0] && candidate.user_identity_id === values[1]
        );
        if (!row) return { rows: [] };
        row.label = values[2] as string;
        return { rows: [row as unknown as T] };
      }
      if (sql.includes("delete from passkey_credentials")) {
        const index = credentials.findIndex(
          (candidate) => candidate.id === values[0] && candidate.user_identity_id === values[1]
        );
        if (index < 0) return { rows: [] };
        const [removed] = credentials.splice(index, 1);
        return { rows: [{ id: removed!.id } as unknown as T] };
      }
      throw new Error(`Unexpected credential query: ${text}`);
    },
  };
  return { db, credentials };
}

interface ChallengeRow {
  id: string;
  challenge: string;
  user_identity_id: string | null;
  purpose: "registration" | "authentication";
  expires_at: Date;
  created_at: Date;
}

function makeChallengeDb() {
  const challenges: ChallengeRow[] = [];
  let nextId = 0;
  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const sql = text.toLowerCase();
      if (sql.includes("insert into passkey_challenges")) {
        const row: ChallengeRow = {
          id: `challenge-${++nextId}`,
          user_identity_id: values[0] as string | null,
          challenge: values[1] as string,
          purpose: values[2] as ChallengeRow["purpose"],
          expires_at: values[3] as Date,
          created_at: new Date("2026-07-27T12:00:00.000Z"),
        };
        challenges.push(row);
        return { rows: [row as unknown as T] };
      }
      if (sql.includes("select") && sql.includes("from passkey_challenges")) {
        const row = challenges
          .filter(
            (candidate) =>
              candidate.challenge === values[0]
              && candidate.purpose === values[1]
              && candidate.expires_at > new Date()
          )
          .sort((left, right) => right.created_at.getTime() - left.created_at.getTime())[0];
        return { rows: row ? [row as unknown as T] : [] };
      }
      if (sql.includes("delete from passkey_challenges") && sql.includes("where challenge = $1")) {
        const index = challenges.findIndex((candidate) => candidate.challenge === values[0]);
        if (index < 0) return { rows: [] };
        const [removed] = challenges.splice(index, 1);
        return { rows: [{ id: removed!.id } as unknown as T] };
      }
      if (sql.includes("delete from passkey_challenges") && sql.includes("expires_at <=")) {
        const cutoff = values[0] as Date;
        const removed = challenges.filter((candidate) => candidate.expires_at <= cutoff);
        for (const row of removed) {
          challenges.splice(challenges.indexOf(row), 1);
        }
        return { rows: removed.map((row) => ({ id: row.id } as unknown as T)) };
      }
      throw new Error(`Unexpected challenge query: ${text}`);
    },
  };
  return { db, challenges };
}

interface EmailVerificationRow {
  id: string;
  email: string;
  code_hash: string;
  verification_token: string | null;
  expires_at: Date;
  used: boolean;
  created_at: Date;
}

function makeEmailVerificationDb() {
  const rows: EmailVerificationRow[] = [];
  let nextId = 0;
  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const sql = text.toLowerCase();
      if (sql.includes("auth_email_verification_count_recent")) {
        const count = rows.filter(
          (row) => row.email === values[0] && row.created_at >= (values[1] as Date)
        ).length;
        return { rows: [{ n: String(count) } as unknown as T] };
      }
      if (sql.includes("auth_email_verification_create")) {
        const row: EmailVerificationRow = {
          id: `email-proof-${++nextId}`,
          email: values[0] as string,
          code_hash: values[1] as string,
          verification_token: null,
          expires_at: values[2] as Date,
          used: false,
          created_at: values[3] as Date,
        };
        rows.push(row);
        return { rows: [row as unknown as T] };
      }
      if (sql.includes("auth_email_verification_find_latest_valid")) {
        const row = rows
          .filter(
            (candidate) =>
              candidate.email === values[0]
              && candidate.code_hash === values[1]
              && !candidate.used
              && candidate.expires_at > (values[2] as Date)
          )
          .sort((left, right) => right.created_at.getTime() - left.created_at.getTime())[0];
        return { rows: row ? [row as unknown as T] : [] };
      }
      if (sql.includes("auth_email_verification_consume")) {
        const row = rows.find(
          (candidate) => candidate.id === values[0] && !candidate.used && candidate.expires_at > new Date()
        );
        if (!row) return { rows: [{ consumed: false } as unknown as T] };
        row.used = true;
        row.verification_token = values[1] as string;
        return { rows: [{ consumed: true } as unknown as T] };
      }
      if (sql.includes("auth_email_verification_verify_token")) {
        const row = rows.find(
          (candidate) =>
            candidate.email === values[0]
            && candidate.verification_token === values[1]
            && candidate.used
            && candidate.expires_at > (values[2] as Date)
        );
        return { rows: [{ verified: Boolean(row) } as unknown as T] };
      }
      throw new Error(`Unexpected email-verification query: ${text}`);
    },
  };
  return { db, rows };
}

interface EmailJournalRow {
  id: string;
  organizationId: string | null;
  toAddress: string;
  subject: string;
  kind: string;
  resourceType: string | null;
  resourceId: string | null;
  status: "queued" | "sent" | "failed";
  provider: string;
  idempotencyKey: string;
  error: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function makeEmailDeliveryDb() {
  const rows: EmailJournalRow[] = [];
  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const sql = text.toLowerCase();
      if (sql.includes("auth_system_email_find")) {
        const row = rows.find(
          (candidate) => candidate.organizationId === null && candidate.idempotencyKey === values[0]
        );
        return { rows: row ? [row as unknown as T] : [] };
      }
      if (sql.includes("auth_system_email_enqueue")) {
        const row: EmailJournalRow = {
          id: `email-${rows.length + 1}`,
          organizationId: null,
          toAddress: values[0] as string,
          subject: values[1] as string,
          kind: values[2] as string,
          resourceType: values[3] as string | null,
          resourceId: values[4] as string | null,
          status: "queued",
          provider: values[5] as string,
          idempotencyKey: values[6] as string,
          error: null,
          sentAt: null,
          createdAt: "2026-07-27T12:00:00.000Z",
          updatedAt: "2026-07-27T12:00:00.000Z",
        };
        rows.push(row);
        return { rows: [row as unknown as T] };
      }
      if (sql.includes("auth_system_email_mark_sent")) {
        const row = rows.find((candidate) => candidate.id === values[0] && candidate.organizationId === null);
        if (!row) return { rows: [] };
        row.status = "sent";
        row.provider = values[1] as string;
        row.sentAt = "2026-07-27T12:00:01.000Z";
        return { rows: [row as unknown as T] };
      }
      if (sql.includes("auth_system_email_mark_failed")) {
        const row = rows.find((candidate) => candidate.id === values[0] && candidate.organizationId === null);
        if (!row) return { rows: [] };
        row.status = "failed";
        row.error = values[1] as string;
        return { rows: [row as unknown as T] };
      }
      if (sql.includes("auth_system_audit_record")) {
        return { rows: [{ id: "audit-1" } as unknown as T] };
      }
      throw new Error(`Unexpected email-delivery query: ${text}`);
    },
  };
  return { db, rows };
}

describe("OpenERP credential port", () => {
  it("reads a legacy credential through platform authentication and persists the counter update", async () => {
    const { db, credentials } = makeCredentialDb();
    const publicKey = new Uint8Array([1, 2, 3, 254]);
    await insertPasskeyCredential(db, {
      userIdentityId: "user-1",
      credentialId: "legacy-credential",
      publicKeyCose: Buffer.from(publicKey).toString("base64url"),
      signCount: 5,
      transports: ["internal"],
      aaguid: null,
      label: "Legacy laptop",
      backedUp: false,
      deviceType: "singleDevice",
    });
    const credentialPort = createOpenERPCredentialPort(db);
    const markUsed = vi.fn(async () => undefined);
    const challenges: AuthHonoChallengePort = {
      create: async () => {
        throw new Error("not used in this contract test");
      },
      findValid: async () => ({
        id: "challenge-1",
        challenge: "challenge-1",
        userId: "user-1",
        type: "authentication",
        expiresAt: new Date(Date.now() + 60_000),
        used: false,
        createdAt: new Date(),
      }),
      markUsed,
      purgeExpired: async () => 0,
    };
    const service = createAuthWebAuthnAuthenticationService({
      ports: {
        credentials: credentialPort,
        challenges,
        users: {
          findById: async () => ({
            id: "user-1",
            email: "alice@example.test",
            displayName: "Alice",
            role: "user",
            emailVerified: true,
            accountStatus: "active",
            approvalDueAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        },
        accountPolicy: { resolveUserVerification: () => "preferred" },
        clock: { now: () => new Date() },
      } as unknown as AuthHonoPorts,
      rp: { id: "app.example.test", name: "OpenERP", expectedOrigins: ["https://app.example.test"] },
      verifyAuthenticationResponse: (async (input: { credential: { publicKey: Uint8Array; counter: number } }) => {
        expect(input.credential.publicKey).toEqual(publicKey);
        expect(input.credential.counter).toBe(5);
        return {
          verified: true,
          authenticationInfo: { newCounter: 9, userVerified: true },
        } as never;
      }) as never,
    });

    await expect(
      service.verifyAuthentication({
        credential: { id: "legacy-credential" } as never,
        expectedChallenge: "challenge-1",
      })
    ).resolves.toMatchObject({ credentialId: "legacy-credential", userId: "user-1", verified: true });
    expect(credentials[0]?.sign_count).toBe(9);
    expect(markUsed).toHaveBeenCalledWith("challenge-1");
  });

  it("maps byte keys, supports ownership checks, and hard-deletes revocations", async () => {
    const { db } = makeCredentialDb();
    const port = createOpenERPCredentialPort(db);
    const created = await port.create({
      userId: "user-1",
      credentialId: "credential-1",
      publicKey: new Uint8Array([9, 8, 7]),
      counter: 1,
      transports: ["usb"],
      name: "Security key",
      backedUp: true,
      deviceType: "multiDevice",
    });
    expect(created.publicKey).toEqual(new Uint8Array([9, 8, 7]));
    expect(await port.findById(created.id)).toMatchObject({ credentialId: "credential-1" });
    expect(await port.findByCredentialId("missing")).toBeNull();
    expect(await port.listForUser("user-1")).toHaveLength(1);
    expect(await port.rename(created.id, "other-user", "Nope")).toBeNull();
    expect(await port.rename(created.id, "user-1", "Renamed key")).toMatchObject({ name: "Renamed key" });
    expect(await port.revoke(created.id, "other-user")).toBe(false);
    expect(await port.revoke(created.id, "user-1")).toBe(true);
    expect(await port.findById(created.id)).toBeNull();
  });

  it("never regresses a stored signature counter or last-used timestamp", async () => {
    const { db, credentials } = makeCredentialDb();
    const port = createOpenERPCredentialPort(db);
    await port.create({
      userId: "user-1",
      credentialId: "credential-monotonic",
      publicKey: new Uint8Array([1]),
      counter: 5,
    });
    const later = new Date("2026-07-27T13:00:00.000Z");
    await port.updateCounter("credential-monotonic", 12, later);
    await port.updateCounter("credential-monotonic", 8, new Date("2026-07-27T12:00:00.000Z"));
    expect(credentials[0]).toMatchObject({ sign_count: 12, last_used_at: later });
  });
});

describe("OpenERP challenge port", () => {
  it("creates, expires, atomically consumes, and purges legacy challenge rows", async () => {
    const { db } = makeChallengeDb();
    const port = createOpenERPChallengePort(db);
    const live = await port.create({
      challenge: "challenge-live",
      userId: "user-1",
      type: "registration",
      expiresAt: new Date(Date.now() + 60_000),
    });
    await port.create({
      challenge: "challenge-expired",
      type: "authentication",
      expiresAt: new Date(Date.now() - 60_000),
    });
    expect(await port.findValid(live.challenge, "registration")).toMatchObject({ userId: "user-1", used: false });
    expect(await port.findValid("challenge-expired", "authentication")).toBeNull();
    const consumption = await Promise.allSettled([port.markUsed(live.challenge), port.markUsed(live.challenge)]);
    expect(consumption.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(consumption.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(await port.purgeExpired(new Date())).toBe(1);
  });
});

describe("OpenERP email-verification port", () => {
  it("stores only a supplied code hash and enforces expiry, one-time use, and token ownership", async () => {
    const { db, rows } = makeEmailVerificationDb();
    const port = createOpenERPEmailVerificationPort(db);
    const now = new Date();
    const record = await port.createCode({
      email: "alice@example.test",
      codeHash: "sha256:opaque-code-hash",
      expiresAt: new Date(now.getTime() + 60_000),
      now,
    });
    await port.createCode({
      email: "alice@example.test",
      codeHash: "sha256:expired",
      expiresAt: new Date(now.getTime() - 60_000),
      now,
    });
    expect(rows[0]?.code_hash).toBe("sha256:opaque-code-hash");
    expect(rows[0]).not.toHaveProperty("code");
    expect(await port.countRecent("alice@example.test", new Date(now.getTime() - 1))).toBe(2);
    expect(await port.findLatestValidCode("alice@example.test", "wrong", now)).toBeNull();
    expect(await port.findLatestValidCode("alice@example.test", "sha256:expired", now)).toBeNull();
    expect(await port.findLatestValidCode("alice@example.test", record.codeHash, now)).toMatchObject({ id: record.id });
    const consumption = await Promise.allSettled([
      port.markUsedWithVerificationToken(record.id, "verification-token"),
      port.markUsedWithVerificationToken(record.id, "verification-token"),
    ]);
    expect(consumption.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await port.verifyToken("alice@example.test", "verification-token", now)).toBe(true);
    expect(await port.verifyToken("bob@example.test", "verification-token", now)).toBe(false);
    expect(
      await port.verifyToken("alice@example.test", "verification-token", new Date(now.getTime() + 120_000))
    ).toBe(false);
  });
});

describe("OpenERP email-delivery port", () => {
  it("uses the product journal and passes the actual verification code to the configured transport", async () => {
    const { db, rows } = makeEmailDeliveryDb();
    const delivered: string[] = [];
    const sender: EmailSender = {
      id: "capturing-test-transport",
      async send(message) {
        delivered.push(message.body);
        return { providerId: "capturing-test-transport" };
      },
    };
    const port = createOpenERPEmailDeliveryPort({ db, sender });
    const expiresAt = new Date("2026-07-27T12:10:00.000Z");
    await port.sendVerificationCode({ email: "alice@example.test", code: "482910", expiresAt });
    await port.sendVerificationCode({ email: "alice@example.test", code: "482910", expiresAt });
    await port.sendVerificationCode({ email: "alice@example.test", code: "482911", expiresAt });
    expect(delivered).toHaveLength(2);
    expect(delivered[0]).toContain("482910");
    expect(delivered[1]).toContain("482911");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ organizationId: null, kind: "auth_email_verification", status: "sent" });
    await expect(
      port.sendMagicLink({ email: "alice@example.test", token: "unused", url: "https://app.example.test", expiresAt })
    ).rejects.toThrow("disabled");
  });

  it("does not turn a product transport failure into a successful delivery", async () => {
    const { db, rows } = makeEmailDeliveryDb();
    const port = createOpenERPEmailDeliveryPort({
      db,
      sender: {
        id: "failing-test-transport",
        async send() {
          throw new Error("mail relay unavailable");
        },
      },
    });

    await expect(
      port.sendVerificationCode({
        email: "alice@example.test",
        code: "482910",
        expiresAt: new Date("2026-07-27T12:10:00.000Z"),
      })
    ).rejects.toThrow("mail relay unavailable");
    expect(rows[0]).toMatchObject({ status: "failed", error: "mail relay unavailable" });
  });
});

describe("OpenERP auth audit port", () => {
  it("writes an explicit system event without inventing a tenant", async () => {
    const db: Queryable = {
      async query<T = unknown>(): Promise<{ rows: T[] }> {
        return { rows: [{ id: "audit-1" } as unknown as T] };
      },
    };
    const query = vi.spyOn(db, "query");
    const port = createOpenERPAuditLogPort(db);
    await port.record("warn", "auth.login_failed", { email: "alice@example.test" });
    expect(query).toHaveBeenCalledTimes(1);
    const [sql, values = []] = query.mock.calls[0]!;
    expect(sql).toContain("auth_system_audit_record");
    expect(values).not.toContain("00000000-0000-0000-0000-000000000000");
  });

  it("surfaces audit delivery failures", async () => {
    const port = createOpenERPAuditLogPort({
      query: async <T = unknown>(): Promise<{ rows: T[] }> => {
        throw new Error("audit database unavailable");
      },
    });
    await expect(port.record("error", "auth.login_failed")).rejects.toThrow("audit database unavailable");
  });
});
