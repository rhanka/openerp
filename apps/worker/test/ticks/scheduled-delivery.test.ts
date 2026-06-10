import { describe, expect, it, vi } from "vitest";

import {
  tickScheduledDelivery,
  type Queryable,
  type WorkerTenantContext,
  type RunDueDeliveriesResult
} from "../../src/ticks/scheduled-delivery.js";

// ---------------------------------------------------------------------------
// Fake Queryable — records all calls in order so we can assert scope ordering.
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("tickScheduledDelivery", () => {
  it("applies scope before calling runDue", async () => {
    const { db, calls } = makeDb();
    const order: string[] = [];

    const runDue = vi.fn().mockImplementation(async () => {
      order.push("runDue");
      return { processed: 0, results: [] };
    });

    // Wrap db.query to record scope calls
    const originalQuery = db.query.bind(db);
    (db as { query: typeof db.query }).query = vi.fn().mockImplementation(
      async (text: string, values?: unknown[]) => {
        if (text.includes("set_config")) {
          order.push(text.includes("''") ? "releaseScope" : "applyScope");
        }
        return originalQuery(text, values);
      }
    );

    await tickScheduledDelivery({ db, organizationId: "org-1", actorUserId: "user-1", runDue });

    expect(order[0]).toBe("applyScope");
    expect(order[1]).toBe("runDue");
    expect(order[2]).toBe("releaseScope");
  });

  it("calls runDue with the correct tenant and db", async () => {
    const { db } = makeDb();
    const fakeResult: RunDueDeliveriesResult = { processed: 2, results: [] };
    const runDue = vi.fn().mockResolvedValue(fakeResult);

    const result = await tickScheduledDelivery({
      db,
      organizationId: "org-2",
      actorUserId: "user-2",
      runDue
    });

    expect(runDue).toHaveBeenCalledOnce();
    const [calledDb, calledTenant, calledAsOf] = runDue.mock.calls[0]!;
    expect(calledDb).toBe(db);
    expect(calledTenant).toEqual({ organizationId: "org-2", actorUserId: "user-2" });
    expect(calledAsOf).toBeUndefined();
    expect(result).toEqual(fakeResult);
  });

  it("forwards asOf to runDue", async () => {
    const { db } = makeDb();
    const runDue = vi.fn().mockResolvedValue({ processed: 0, results: [] });
    const asOf = new Date("2026-06-01T12:00:00Z");

    await tickScheduledDelivery({ db, organizationId: "org-3", actorUserId: "user-3", asOf, runDue });

    expect(runDue.mock.calls[0]![2]).toBe(asOf);
  });

  it("releases scope even when runDue throws", async () => {
    const { db, calls } = makeDb();
    const runDue = vi.fn().mockRejectedValue(new Error("db error"));

    await expect(
      tickScheduledDelivery({ db, organizationId: "org-4", actorUserId: "user-4", runDue })
    ).rejects.toThrow("db error");

    const releaseCall = calls.find(
      (c) => c.text.includes("set_config") && c.text.includes("''")
    );
    expect(releaseCall).toBeDefined();
  });

  it("sets the correct organizationId in the scope query", async () => {
    const { db, calls } = makeDb();
    const runDue = vi.fn().mockResolvedValue({ processed: 0, results: [] });

    await tickScheduledDelivery({ db, organizationId: "org-uuid-123", actorUserId: "user-1", runDue });

    const applyCall = calls.find(
      (c) => c.text.includes("set_config") && !c.text.includes("''")
    );
    expect(applyCall?.values?.[0]).toBe("org-uuid-123");
  });
});
