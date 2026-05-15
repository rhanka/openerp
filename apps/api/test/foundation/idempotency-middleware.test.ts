import { describe, expect, it } from "vitest";
import type { IdempotencyRecord } from "@sentropic/openerp-domain";
import type { Queryable } from "../../src/db/client";
import {
  IDEMPOTENCY_TTL_SECONDS,
  IdempotencyKeyRequiredError,
  withIdempotency
} from "../../src/http/idempotency-middleware";

function makeFakeDb() {
  const rows: IdempotencyRecord[] = [];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;
      if (t.includes("with attempt") && t.includes("insert into idempotency_records")) {
        const [organizationId, key, requestHash, responseBodyHash, statusCode, createdAt, expiresAt] =
          values as [string, string, string, string, number, string, string];
        const existing = rows.find((r) => r.organizationId === organizationId && r.key === key);
        if (existing) {
          return { rows: [{ replay: true, ...existing } as unknown as T] };
        }
        const record: IdempotencyRecord = {
          organizationId, key, requestHash, responseBodyHash, statusCode, createdAt, expiresAt
        };
        rows.push(record);
        return { rows: [{ replay: false, ...record } as unknown as T] };
      }
      if (t.includes("update idempotency_records") && t.includes("set response_body_hash")) {
        const [organizationId, key, responseBodyHash, statusCode] = values as [
          string, string, string, number
        ];
        const idx = rows.findIndex((r) => r.organizationId === organizationId && r.key === key);
        if (idx === -1) return { rows: [] };
        rows[idx] = { ...rows[idx]!, responseBodyHash, statusCode };
        return { rows: [rows[idx]! as unknown as T] };
      }
      return { rows: [] };
    }
  };

  return { db, getRows: () => rows };
}

const context = { organizationId: "org_1", actorUserId: "user_1" };

const baseRequest = {
  method: "POST",
  path: "/invoices",
  body: { amount: 12345, currency: "USD" }
};

describe("withIdempotency wrapper (PG-08)", () => {
  it("throws IdempotencyKeyRequiredError when header missing", async () => {
    const { db } = makeFakeDb();
    await expect(
      withIdempotency(db, context,
        { ...baseRequest, headers: {} },
        async () => ({ statusCode: 201, body: { ok: true } })
      )
    ).rejects.toBeInstanceOf(IdempotencyKeyRequiredError);
  });

  it("accepts the header in any casing", async () => {
    const { db } = makeFakeDb();
    const outcome = await withIdempotency(db, context,
      { ...baseRequest, headers: { "IDEMPOTENCY-KEY": "k1" } },
      async () => ({ statusCode: 201, body: { id: "inv_1" } })
    );
    expect(outcome.replayed).toBe(false);
    expect(outcome.statusCode).toBe(201);
  });

  it("registers on first call, runs the handler, and finalises the record", async () => {
    const { db, getRows } = makeFakeDb();
    const outcome = await withIdempotency(db, context,
      { ...baseRequest, headers: { "idempotency-key": "k1" } },
      async () => ({ statusCode: 201, body: { id: "inv_1" } }),
      () => "2026-05-14T12:00:00.000Z"
    );
    expect(outcome.replayed).toBe(false);
    const stored = getRows()[0]!;
    expect(stored.statusCode).toBe(201);
    expect(stored.responseBodyHash).toMatch(/^sha256:/);
    const expectedExpiry = new Date(
      Date.parse("2026-05-14T12:00:00.000Z") + IDEMPOTENCY_TTL_SECONDS * 1000
    ).toISOString();
    expect(stored.expiresAt).toBe(expectedExpiry);
  });

  it("short-circuits the handler on replay and returns the cached status code", async () => {
    const { db } = makeFakeDb();
    let handlerCalls = 0;
    const handler = async () => {
      handlerCalls++;
      return { statusCode: 201, body: { id: "inv_1" } };
    };

    await withIdempotency(db, context,
      { ...baseRequest, headers: { "idempotency-key": "k1" } }, handler);
    const replay = await withIdempotency(db, context,
      { ...baseRequest, headers: { "idempotency-key": "k1" } }, handler);

    expect(handlerCalls).toBe(1);
    expect(replay.replayed).toBe(true);
    expect(replay.statusCode).toBe(201);
    expect(replay.body).toMatchObject({ replayed: true, key: "k1", originalStatusCode: 201 });
  });

  it("marks the record with statusCode 500 if the handler throws and rethrows", async () => {
    const { db, getRows } = makeFakeDb();
    await expect(
      withIdempotency(db, context,
        { ...baseRequest, headers: { "idempotency-key": "k1" } },
        async () => { throw new Error("boom"); })
    ).rejects.toThrow("boom");
    expect(getRows()[0]!.statusCode).toBe(500);
    expect(getRows()[0]!.responseBodyHash).toBe("");
  });

  it("treats the same request body in different key order as equivalent for the request hash", async () => {
    const { db } = makeFakeDb();
    const r1 = await withIdempotency(db, context,
      { method: "POST", path: "/x", body: { a: 1, b: 2 }, headers: { "idempotency-key": "k1" } },
      async () => ({ statusCode: 200, body: { ok: true } })
    );
    const r2 = await withIdempotency(db, context,
      { method: "POST", path: "/x", body: { b: 2, a: 1 }, headers: { "idempotency-key": "k2" } },
      async () => ({ statusCode: 200, body: { ok: true } })
    );
    expect(r1.record.requestHash).toBe(r2.record.requestHash);
  });
});
