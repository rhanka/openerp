import { describe, expect, it, vi } from "vitest";

import {
  tickWebhookEgress,
  type Queryable,
  type WebhookEgressPort,
  type RunDueWebhookDeliveriesResult,
  type RunDueWebhookDeliveriesDeps
} from "../../src/ticks/webhook-egress.js";

// ---------------------------------------------------------------------------
// Fake Queryable
// ---------------------------------------------------------------------------

interface QueryCall {
  text: string;
  values: unknown[] | undefined;
}

function makeDb(): { db: Queryable; calls: QueryCall[] } {
  const calls: QueryCall[] = [];
  const db: Queryable = {
    query: vi.fn().mockImplementation(async (text: string, values?: unknown[]) => {
      calls.push({ text, values });
      return { rows: [] };
    })
  };
  return { db, calls };
}

function makeFakeResult(): RunDueWebhookDeliveriesResult {
  return { processed: 0, succeeded: 0, failed: 0, skipped: 0, asOf: new Date() };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("tickWebhookEgress", () => {
  it("applies scope before calling runDue", async () => {
    const { db } = makeDb();
    const order: string[] = [];

    const originalQuery = db.query.bind(db);
    (db as { query: typeof db.query }).query = vi.fn().mockImplementation(
      async (text: string, values?: unknown[]) => {
        if (text.includes("set_config")) {
          order.push(text.includes("''") ? "releaseScope" : "applyScope");
        }
        return originalQuery(text, values);
      }
    );

    const runDue = vi.fn().mockImplementation(async () => {
      order.push("runDue");
      return makeFakeResult();
    });

    await tickWebhookEgress({ db, organizationId: "org-1", actorUserId: "user-1", runDue });

    expect(order[0]).toBe("applyScope");
    expect(order[1]).toBe("runDue");
    expect(order[2]).toBe("releaseScope");
  });

  it("calls runDue with correct tenant, asOf=undefined, and empty deps when no port supplied", async () => {
    const { db } = makeDb();
    const fakeResult = makeFakeResult();
    const runDue = vi.fn().mockResolvedValue(fakeResult);

    const result = await tickWebhookEgress({
      db,
      organizationId: "org-2",
      actorUserId: "user-2",
      runDue
    });

    expect(runDue).toHaveBeenCalledOnce();
    const [calledDb, calledTenant, calledAsOf, calledDeps] = runDue.mock.calls[0]!;
    expect(calledDb).toBe(db);
    expect(calledTenant).toEqual({ organizationId: "org-2", actorUserId: "user-2" });
    expect(calledAsOf).toBeUndefined();
    expect(calledDeps).toEqual({});
    expect(result).toEqual(fakeResult);
  });

  it("includes egressPort and timeoutMs in deps when provided", async () => {
    const { db } = makeDb();
    const runDue = vi.fn().mockResolvedValue(makeFakeResult());

    const fakePort: WebhookEgressPort = {
      send: vi.fn().mockResolvedValue({ ok: true, httpStatus: 200, durationMs: 5 })
    };

    await tickWebhookEgress({
      db,
      organizationId: "org-3",
      actorUserId: "user-3",
      egressPort: fakePort,
      timeoutMs: 5000,
      runDue
    });

    const calledDeps = runDue.mock.calls[0]![3] as RunDueWebhookDeliveriesDeps;
    expect(calledDeps.port).toBe(fakePort);
    expect(calledDeps.timeoutMs).toBe(5000);
  });

  it("forwards asOf to runDue", async () => {
    const { db } = makeDb();
    const runDue = vi.fn().mockResolvedValue(makeFakeResult());
    const asOf = new Date("2026-06-01T00:00:00Z");

    await tickWebhookEgress({ db, organizationId: "org-4", actorUserId: "user-4", asOf, runDue });

    expect(runDue.mock.calls[0]![2]).toBe(asOf);
  });

  it("releases scope even when runDue throws", async () => {
    const { db, calls } = makeDb();
    const runDue = vi.fn().mockRejectedValue(new Error("egress error"));

    await expect(
      tickWebhookEgress({ db, organizationId: "org-5", actorUserId: "user-5", runDue })
    ).rejects.toThrow("egress error");

    const releaseCall = calls.find(
      (c) => c.text.includes("set_config") && c.text.includes("''")
    );
    expect(releaseCall).toBeDefined();
  });

  it("sets the correct organizationId in the scope query", async () => {
    const { db, calls } = makeDb();
    const runDue = vi.fn().mockResolvedValue(makeFakeResult());

    await tickWebhookEgress({ db, organizationId: "org-uuid-789", actorUserId: "user-1", runDue });

    const applyCall = calls.find(
      (c) => c.text.includes("set_config") && !c.text.includes("''")
    );
    expect(applyCall?.values?.[0]).toBe("org-uuid-789");
  });
});
