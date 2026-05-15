import { describe, expect, it } from "vitest";
import type { IdempotencyRecord } from "@sentropic/openerp-domain";
import type { Queryable } from "../../src/db/client";
import {
  canonicalRequestPayload,
  findIdempotencyRecord,
  purgeExpiredIdempotencyRecords,
  registerOrReplayIdempotencyRecord
} from "../../src/foundation/idempotency";

function makeFakeDb() {
  type Stored = IdempotencyRecord;
  const rows: Stored[] = [];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;
      // registerOrReplay
      if (t.includes("with attempt") && t.includes("insert into idempotency_records")) {
        const [organizationId, key, requestHash, responseBodyHash, statusCode, createdAt, expiresAt] =
          values as [string, string, string, string, number, string, string];
        const existing = rows.find((r) => r.organizationId === organizationId && r.key === key);
        if (existing) {
          return { rows: [{ replay: true, ...existing } as unknown as T] };
        }
        const record: Stored = {
          organizationId,
          key,
          requestHash,
          responseBodyHash,
          statusCode,
          createdAt,
          expiresAt
        };
        rows.push(record);
        return { rows: [{ replay: false, ...record } as unknown as T] };
      }
      // find by key
      if (t.includes("from idempotency_records") && t.includes("where organization_id = $1 and key = $2")) {
        const [organizationId, key] = values as [string, string];
        const found = rows.find((r) => r.organizationId === organizationId && r.key === key);
        return { rows: found ? [found as unknown as T] : [] };
      }
      // purge expired
      if (t.includes("delete from idempotency_records")) {
        const [asOf] = values as [string];
        const purged: Stored[] = [];
        for (let i = rows.length - 1; i >= 0; i--) {
          const row = rows[i]!;
          if (row.expiresAt <= asOf) {
            purged.push(row);
            rows.splice(i, 1);
          }
        }
        return { rows: purged.map((r) => ({ key: r.key })) as unknown as T[] };
      }
      return { rows: [] };
    }
  };

  return { db };
}

const context = { organizationId: "org_1", actorUserId: "user_1" };

describe("IdempotencyStore repository (PG-08)", () => {
  it("registers a new record on first call", async () => {
    const { db } = makeFakeDb();
    const result = await registerOrReplayIdempotencyRecord(db, context, {
      key: "invoice_issue:invoice_1",
      requestHash: "sha256:abcd",
      responseBodyHash: "sha256:efgh",
      statusCode: 201,
      ttlSeconds: 86400,
      now: "2026-05-14T12:00:00.000Z"
    });
    expect(result.replay).toBe(false);
    expect(result.record.statusCode).toBe(201);
    expect(result.record.expiresAt).toBe("2026-05-15T12:00:00.000Z");
  });

  it("returns the existing record on replay without re-running side effects", async () => {
    const { db } = makeFakeDb();
    await registerOrReplayIdempotencyRecord(db, context, {
      key: "invoice_issue:invoice_1",
      requestHash: "sha256:abcd",
      responseBodyHash: "sha256:efgh",
      statusCode: 201,
      ttlSeconds: 86400,
      now: "2026-05-14T12:00:00.000Z"
    });
    const replay = await registerOrReplayIdempotencyRecord(db, context, {
      key: "invoice_issue:invoice_1",
      requestHash: "sha256:abcd",
      responseBodyHash: "different",
      statusCode: 999,
      ttlSeconds: 86400,
      now: "2026-05-14T12:30:00.000Z"
    });
    expect(replay.replay).toBe(true);
    expect(replay.record.responseBodyHash).toBe("sha256:efgh");
    expect(replay.record.statusCode).toBe(201);
  });

  it("rejects non-positive TTL", async () => {
    const { db } = makeFakeDb();
    await expect(
      registerOrReplayIdempotencyRecord(db, context, {
        key: "k",
        requestHash: "h",
        responseBodyHash: "h",
        statusCode: 200,
        ttlSeconds: 0,
        now: "2026-05-14T12:00:00.000Z"
      })
    ).rejects.toThrow(/ttlSeconds/);
  });

  it("looks up a record by key scoped to the tenant", async () => {
    const { db } = makeFakeDb();
    await registerOrReplayIdempotencyRecord(db, context, {
      key: "k1",
      requestHash: "h",
      responseBodyHash: "h",
      statusCode: 200,
      ttlSeconds: 60,
      now: "2026-05-14T12:00:00.000Z"
    });
    const found = await findIdempotencyRecord(db, context, "k1");
    expect(found?.key).toBe("k1");

    const missing = await findIdempotencyRecord(db, context, "nope");
    expect(missing).toBeNull();
  });

  it("purges only records past their expiry", async () => {
    const { db } = makeFakeDb();
    await registerOrReplayIdempotencyRecord(db, context, {
      key: "expired",
      requestHash: "h",
      responseBodyHash: "h",
      statusCode: 200,
      ttlSeconds: 60,
      now: "2026-05-14T11:00:00.000Z"
    });
    await registerOrReplayIdempotencyRecord(db, context, {
      key: "fresh",
      requestHash: "h",
      responseBodyHash: "h",
      statusCode: 200,
      ttlSeconds: 86400,
      now: "2026-05-14T12:00:00.000Z"
    });
    const purged = await purgeExpiredIdempotencyRecords(db, "2026-05-14T11:30:00.000Z");
    expect(purged).toBe(1);
    expect(await findIdempotencyRecord(db, context, "expired")).toBeNull();
    expect(await findIdempotencyRecord(db, context, "fresh")).not.toBeNull();
  });

  it("canonicalises request payloads with stable key order", () => {
    const a = canonicalRequestPayload("POST", "/invoices", { z: 1, a: { y: 2, x: 1 } });
    const b = canonicalRequestPayload("post", "/invoices", { a: { x: 1, y: 2 }, z: 1 });
    expect(a).toBe(b);
  });
});
