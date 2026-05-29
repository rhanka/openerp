import { describe, expect, it } from "vitest";

import type { QuoteHandoff, QuoteHandoffStatus } from "@sentropic/openerp-domain/crm";
import type { Queryable } from "../../src/db/client";
import {
  QuoteHandoffNotFoundError,
  QuoteHandoffTransitionError,
  createQuoteHandoff,
  acceptQuoteHandoff,
  rejectQuoteHandoff,
  getQuoteHandoffById,
  listQuoteHandoffs
} from "../../src/crm/quote-handoff-service";

interface AuditRow {
  action: string;
}

interface TimelineRow {
  entryType: string;
}

function makeFakeDb() {
  const handoffs: (QuoteHandoff & { _deleted?: boolean })[] = [];
  const audits: AuditRow[] = [];
  const timelines: TimelineRow[] = [];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text.trim();

      // insert quote_handoffs
      if (t.includes("insert into quote_handoffs")) {
        const [orgId, opportunityId, targetType, requestedByUserId] =
          values as [string, string, string, string | null];
        const row: QuoteHandoff = {
          id: `qh_${handoffs.length + 1}`,
          organizationId: orgId,
          opportunityId,
          targetType: targetType as QuoteHandoff["targetType"],
          status: "pending",
          requestedByUserId,
          acceptedAt: null,
          deletedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        handoffs.push(row);
        return { rows: [row as unknown as T] };
      }

      // find by id
      if (t.includes("from quote_handoffs") && t.includes("where id = $1")) {
        const [id, orgId] = values as [string, string];
        const found = handoffs.find(
          (h) => h.id === id && h.organizationId === orgId && !h._deleted
        );
        return { rows: found ? [found as unknown as T] : [] };
      }

      // list
      if (t.includes("from quote_handoffs") && t.includes("order by created_at")) {
        const [orgId] = values as [string];
        const rows = handoffs.filter((h) => h.organizationId === orgId && !h._deleted);
        return { rows: rows as unknown as T[] };
      }

      // update status
      if (t.includes("update quote_handoffs") && t.includes("status = $3")) {
        const [id, orgId, newStatus] = values as [string, string, string];
        const h = handoffs.find(
          (x) => x.id === id && x.organizationId === orgId && !x._deleted
        );
        if (!h) return { rows: [] };
        h.status = newStatus as QuoteHandoffStatus;
        if (t.includes("accepted_at")) {
          h.acceptedAt = values[3] as string | null;
        }
        return { rows: [h as unknown as T] };
      }

      // soft delete
      if (t.includes("update quote_handoffs") && t.includes("deleted_at = now()")) {
        const [id, orgId] = values as [string, string];
        const h = handoffs.find(
          (x) => x.id === id && x.organizationId === orgId && !x._deleted
        );
        if (!h) return { rows: [] };
        h._deleted = true;
        return { rows: [{ id: h.id } as unknown as T] };
      }

      // audit_events
      if (t.includes("insert into audit_events")) {
        const action = values[3] as string;
        audits.push({ action });
        return { rows: [] };
      }

      // timeline_entries
      if (t.includes("insert into timeline_entries")) {
        const entryType = values[4] as string;
        timelines.push({ entryType });
        return { rows: [{ id: "te_1" } as unknown as T] };
      }

      return { rows: [] };
    }
  };

  return { db, handoffs, audits, timelines };
}

const TENANT = { organizationId: "org-1", actorUserId: "user-1" };

describe("quote-handoff service — unit", () => {
  it("createQuoteHandoff: creates with pending status, emits crm.quote_handoff.requested", async () => {
    const { db, audits, timelines } = makeFakeDb();
    const handoff = await createQuoteHandoff(db, TENANT, {
      opportunityId: "opp-1",
      targetType: "invoice",
      requestedByUserId: "user-1"
    });
    expect(handoff.status).toBe("pending");
    expect(handoff.targetType).toBe("invoice");
    expect(handoff.opportunityId).toBe("opp-1");
    expect(audits.some((a) => a.action === "crm.quote_handoff.requested")).toBe(true);
    expect(timelines.some((t) => t.entryType === "crm.quote_handoff.requested")).toBe(true);
  });

  it("acceptQuoteHandoff: transitions pending -> accepted, emits crm.quote_handoff.accepted", async () => {
    const { db, audits, timelines } = makeFakeDb();
    const handoff = await createQuoteHandoff(db, TENANT, {
      opportunityId: "opp-1",
      targetType: "invoice"
    });
    const accepted = await acceptQuoteHandoff(db, TENANT, handoff.id);
    expect(accepted.status).toBe("accepted");
    expect(accepted.acceptedAt).toBeTruthy();
    expect(audits.some((a) => a.action === "crm.quote_handoff.accepted")).toBe(true);
    expect(timelines.some((t) => t.entryType === "crm.quote_handoff.accepted")).toBe(true);
  });

  it("acceptQuoteHandoff: rejects when not pending (transition guard)", async () => {
    const { db } = makeFakeDb();
    const handoff = await createQuoteHandoff(db, TENANT, {
      opportunityId: "opp-1",
      targetType: "invoice"
    });
    await acceptQuoteHandoff(db, TENANT, handoff.id);
    await expect(acceptQuoteHandoff(db, TENANT, handoff.id)).rejects.toBeInstanceOf(
      QuoteHandoffTransitionError
    );
  });

  it("rejectQuoteHandoff: transitions pending -> rejected, emits crm.quote_handoff.rejected", async () => {
    const { db, audits, timelines } = makeFakeDb();
    const handoff = await createQuoteHandoff(db, TENANT, {
      opportunityId: "opp-1",
      targetType: "invoice"
    });
    const rejected = await rejectQuoteHandoff(db, TENANT, handoff.id);
    expect(rejected.status).toBe("rejected");
    expect(audits.some((a) => a.action === "crm.quote_handoff.rejected")).toBe(true);
    expect(timelines.some((t) => t.entryType === "crm.quote_handoff.rejected")).toBe(true);
  });

  it("rejectQuoteHandoff: rejects when already accepted (transition guard)", async () => {
    const { db } = makeFakeDb();
    const handoff = await createQuoteHandoff(db, TENANT, {
      opportunityId: "opp-1",
      targetType: "invoice"
    });
    await acceptQuoteHandoff(db, TENANT, handoff.id);
    await expect(rejectQuoteHandoff(db, TENANT, handoff.id)).rejects.toBeInstanceOf(
      QuoteHandoffTransitionError
    );
  });

  it("getQuoteHandoffById: returns null for unknown id", async () => {
    const { db } = makeFakeDb();
    const found = await getQuoteHandoffById(db, TENANT, "no-such-id");
    expect(found).toBeNull();
  });

  it("listQuoteHandoffs: returns handoffs for org", async () => {
    const { db } = makeFakeDb();
    await createQuoteHandoff(db, TENANT, { opportunityId: "opp-1", targetType: "invoice" });
    await createQuoteHandoff(db, TENANT, { opportunityId: "opp-2", targetType: "project" });
    const list = await listQuoteHandoffs(db, TENANT);
    expect(list).toHaveLength(2);
  });

  it("QuoteHandoffNotFoundError is thrown on lifecycle transitions for unknown id", async () => {
    const { db } = makeFakeDb();
    await expect(acceptQuoteHandoff(db, TENANT, "no-such-id")).rejects.toBeInstanceOf(
      QuoteHandoffNotFoundError
    );
    await expect(rejectQuoteHandoff(db, TENANT, "no-such-id")).rejects.toBeInstanceOf(
      QuoteHandoffNotFoundError
    );
  });
});
