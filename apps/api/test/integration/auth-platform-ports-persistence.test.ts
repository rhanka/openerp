import { randomUUID } from "node:crypto";

import { createAuthWebAuthnAuthenticationService } from "@sentropic/auth-hono/webauthn-authentication";
import type { AuthHonoChallengePort, AuthHonoPorts } from "@sentropic/auth-hono";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createOpenERPCredentialPort } from "../../src/auth/openerp-credential-port";
import { createOpenERPEmailDeliveryPort } from "../../src/auth/openerp-email-delivery-port";
import { createOpenERPEmailVerificationPort } from "../../src/auth/openerp-email-verification-port";
import { runMigrations } from "../../src/db/migrate";
import { createPgPool, type PgPoolHandle } from "../../src/db/pg-client";
import type { EmailSender } from "../../src/foundation/email-sender";
import { insertPasskeyCredential } from "../../src/foundation/passkey-credentials";
import { createEphemeralDb, type EphemeralDb } from "./helpers/ephemeral-db";

const url = process.env.OPENERP_INTEGRATION_DATABASE_URL;
const describeOrSkip = url ? describe : describe.skip;

describeOrSkip("auth platform Lot 1 persistence against PostgreSQL", () => {
  let pool: PgPoolHandle;
  let ephemeral: EphemeralDb;

  beforeAll(async () => {
    ephemeral = await createEphemeralDb("auth_lot01");
    pool = createPgPool({ connectionString: ephemeral.connectionString, max: 8 });
    await runMigrations(pool, {
      directory: new URL("../../src/db/migrations", import.meta.url).pathname,
    });
  }, 30_000);

  afterAll(async () => {
    if (pool) await pool.end();
    if (ephemeral) await ephemeral.drop();
  });

  it("authenticates a legacy credential through the platform service and preserves a monotonic counter", async () => {
    const userId = randomUUID();
    const credentialId = `legacy-${randomUUID()}`;
    const publicKey = new Uint8Array([1, 2, 3, 254]);
    await pool.query(
      `insert into user_identities (
         id, email, display_name, preferred_locale, mfa_state, status, actor_type
       ) values ($1, $2, 'Legacy identity', 'en', 'passkey', 'active', 'human')`,
      [userId, `${userId}@example.test`]
    );
    await insertPasskeyCredential(pool, {
      userIdentityId: userId,
      credentialId,
      publicKeyCose: Buffer.from(publicKey).toString("base64url"),
      signCount: 5,
      transports: ["internal"],
      aaguid: null,
      label: "Legacy laptop",
      backedUp: false,
      deviceType: "singleDevice",
    });

    const credentials = createOpenERPCredentialPort(pool);
    const markUsed = vi.fn(async () => undefined);
    const challenges: AuthHonoChallengePort = {
      create: async () => {
        throw new Error("not used by this contract");
      },
      findValid: async () => ({
        id: "challenge-1",
        challenge: "challenge-1",
        userId,
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
        credentials,
        challenges,
        users: {
          findById: async () => ({
            id: userId,
            email: `${userId}@example.test`,
            displayName: "Legacy identity",
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
        return { verified: true, authenticationInfo: { newCounter: 12, userVerified: true } } as never;
      }) as never,
    });

    await expect(
      service.verifyAuthentication({
        credential: { id: credentialId } as never,
        expectedChallenge: "challenge-1",
      })
    ).resolves.toMatchObject({ credentialId, userId, verified: true });
    expect(markUsed).toHaveBeenCalledWith("challenge-1");

    await credentials.updateCounter(credentialId, 8, new Date("2026-07-27T11:00:00.000Z"));
    const persisted = await credentials.findByCredentialId(credentialId);
    expect(persisted).toMatchObject({ counter: 12 });
  });

  it("keeps pre-tenant verification and system mail rows inaccessible by direct app-role SQL", async () => {
    const email = `proof-${randomUUID()}@example.test`;
    const verification = createOpenERPEmailVerificationPort(pool);
    const now = new Date();
    const created = await verification.createCode({
      email,
      codeHash: "sha256:opaque-code-hash",
      expiresAt: new Date(now.getTime() + 60_000),
      now,
    });
    const delivered: string[] = [];
    const sender: EmailSender = {
      id: "postgres-capturing-transport",
      async send(message) {
        delivered.push(message.body);
        return { providerId: "postgres-capturing-transport" };
      },
    };
    await createOpenERPEmailDeliveryPort({ db: pool, sender }).sendVerificationCode({
      email,
      code: "482910",
      expiresAt: new Date(now.getTime() + 60_000),
    });
    expect(delivered).toEqual([expect.stringContaining("482910")]);

    await pool.withClient(async (client) => {
      await client.query("begin");
      try {
        await client.query("set local role openerp_app");
        expect(
          (await client.query("select id from auth_email_verifications where email = $1", [email])).rows
        ).toEqual([]);
        expect(
          (await client.query("select id from email_sends where organization_id is null")).rows
        ).toEqual([]);

        const count = await client.query<{ count: string }>(
          "select auth_email_verification_count_recent($1, $2) as count",
          [email, new Date(now.getTime() - 1_000)]
        );
        expect(count.rows[0]?.count).toBe("1");

        await client.query("savepoint direct_pretenant_write");
        await expect(client.query(
          `insert into auth_email_verifications (
             organization_id, email, code_hash, expires_at
           ) values (null, $1, 'direct-write', now() + interval '1 minute')`,
          [`blocked-${email}`]
        )).rejects.toMatchObject({ code: "42501" });
        await client.query("rollback to savepoint direct_pretenant_write");

        const viaFunction = await client.query<{ id: string }>(
          "select * from auth_email_verification_find_latest_valid($1, $2, $3)",
          [email, created.codeHash, now]
        );
        expect(viaFunction.rows.map((row) => row.id)).toEqual([created.id]);
        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    });
  });
});
