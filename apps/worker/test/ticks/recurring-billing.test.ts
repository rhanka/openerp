import { describe, expect, it, vi } from "vitest";

import {
  tickRecurringBilling,
  type Queryable,
  type RunDueRecurringBillingResult
} from "../../src/ticks/recurring-billing.js";

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("tickRecurringBilling", () => {
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
      return { generated: 0, invoiceIds: [] };
    });

    await tickRecurringBilling({ db, organizationId: "org-1", actorUserId: "user-1", runDue });

    expect(order[0]).toBe("applyScope");
    expect(order[1]).toBe("runDue");
    expect(order[2]).toBe("releaseScope");
  });

  it("calls runDue with the correct tenant and asOfDate", async () => {
    const { db } = makeDb();
    const fakeResult: RunDueRecurringBillingResult = { generated: 3, invoiceIds: ["i1", "i2", "i3"] };
    const runDue = vi.fn().mockResolvedValue(fakeResult);

    const result = await tickRecurringBilling({
      db,
      organizationId: "org-2",
      actorUserId: "user-2",
      asOfDate: "2026-06-01",
      runDue
    });

    expect(runDue).toHaveBeenCalledOnce();
    const [calledDb, calledTenant, calledAsOfDate] = runDue.mock.calls[0]!;
    expect(calledDb).toBe(db);
    expect(calledTenant).toEqual({ organizationId: "org-2", actorUserId: "user-2" });
    expect(calledAsOfDate).toBe("2026-06-01");
    expect(result).toEqual(fakeResult);
  });

  it("defaults asOfDate to today when not supplied", async () => {
    const { db } = makeDb();
    const runDue = vi.fn().mockResolvedValue({ generated: 0, invoiceIds: [] });
    const before = new Date().toISOString().slice(0, 10);

    await tickRecurringBilling({ db, organizationId: "org-3", actorUserId: "user-3", runDue });

    const after = new Date().toISOString().slice(0, 10);
    const calledAsOfDate = runDue.mock.calls[0]![2] as string;
    expect(calledAsOfDate >= before).toBe(true);
    expect(calledAsOfDate <= after).toBe(true);
  });

  it("releases scope even when runDue throws", async () => {
    const { db, calls } = makeDb();
    const runDue = vi.fn().mockRejectedValue(new Error("billing error"));

    await expect(
      tickRecurringBilling({ db, organizationId: "org-4", actorUserId: "user-4", runDue })
    ).rejects.toThrow("billing error");

    const releaseCall = calls.find(
      (c) => c.text.includes("set_config") && c.text.includes("''")
    );
    expect(releaseCall).toBeDefined();
  });

  it("sets the correct organizationId in the scope query", async () => {
    const { db, calls } = makeDb();
    const runDue = vi.fn().mockResolvedValue({ generated: 0, invoiceIds: [] });

    await tickRecurringBilling({ db, organizationId: "org-uuid-456", actorUserId: "user-1", runDue });

    const applyCall = calls.find(
      (c) => c.text.includes("set_config") && !c.text.includes("''")
    );
    expect(applyCall?.values?.[0]).toBe("org-uuid-456");
  });
});
