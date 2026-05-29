import { describe, expect, it } from "vitest";

import type { Opportunity } from "@sentropic/openerp-domain/crm";

import type { Queryable } from "../../src/db/client";
import {
  LossReasonRequiredError,
  OpportunityNotFoundError,
  createOpportunity,
  deleteOpportunity,
  listOpportunities,
  updateOpportunity
} from "../../src/crm/opportunity-service";

interface AuditRow {
  action: string;
  resourceType: string;
  resourceId: string;
  beforeSummary: unknown;
  afterSummary: unknown;
}

function makeFakeDb() {
  const opportunities: Opportunity[] = [];
  const audits: AuditRow[] = [];
  const quoteHandoffs: Array<{ id: string; organizationId: string; opportunityId: string; targetType: string; status: string; requestedByUserId: string | null; acceptedAt: null; deletedAt: null; createdAt: string; updatedAt: string }> = [];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;

      if (t.includes("insert into opportunities")) {
        const [
          organizationId,
          companyId,
          primaryContactId,
          name,
          stageId,
          ownerUserId,
          teamId,
          expectedValue,
          currency,
          expectedCloseDate,
          probabilityBand,
          serviceSummary
        ] = values as [
          string,
          string,
          string | null,
          string,
          string,
          string | null,
          string | null,
          unknown,
          string | null,
          string | null,
          "low" | "medium" | "high" | null,
          string | null
        ];
        const row: Opportunity = {
          id: `op_${opportunities.length + 1}`,
          organizationId,
          companyId,
          primaryContactId,
          name,
          stageId,
          status: "open",
          ownerUserId,
          teamId,
          expectedValue: expectedValue as Opportunity["expectedValue"],
          currency,
          expectedCloseDate,
          probabilityBand,
          serviceSummary,
          lossReason: null,
          createdAt: "2026-05-23T17:00:00.000Z",
          updatedAt: "2026-05-23T17:00:00.000Z"
        };
        opportunities.push(row);
        return { rows: [row as unknown as T] };
      }

      if (t.includes("from opportunities") && t.includes("where id = $1")) {
        const [id, organizationId] = values as [string, string];
        const found = opportunities.find(
          (o) =>
            o.id === id &&
            o.organizationId === organizationId &&
            !(o as unknown as { _deleted?: boolean })._deleted
        );
        return { rows: found ? [found as unknown as T] : [] };
      }

      if (t.includes("from opportunities") && t.includes("order by created_at desc")) {
        const [organizationId, status, companyId, stageId, limit, offset] = values as [
          string,
          string | null,
          string | null,
          string | null,
          number,
          number
        ];
        const filtered = opportunities
          .filter((o) => o.organizationId === organizationId)
          .filter((o) => !(o as unknown as { _deleted?: boolean })._deleted)
          .filter((o) => (status ? o.status === status : true))
          .filter((o) => (companyId ? o.companyId === companyId : true))
          .filter((o) => (stageId ? o.stageId === stageId : true))
          .slice(offset, offset + limit);
        return { rows: filtered as unknown as T[] };
      }

      if (t.includes("update opportunities") && t.includes("deleted_at = now()")) {
        const [id, organizationId] = values as [string, string];
        const idx = opportunities.findIndex(
          (o) =>
            o.id === id &&
            o.organizationId === organizationId &&
            !(o as unknown as { _deleted?: boolean })._deleted
        );
        if (idx === -1) return { rows: [] };
        (opportunities[idx] as unknown as { _deleted: boolean })._deleted = true;
        return { rows: [{ id: opportunities[idx]!.id } as unknown as T] };
      }

      if (t.includes("update opportunities")) {
        const [id, organizationId] = values as [string, string];
        const idx = opportunities.findIndex(
          (o) => o.id === id && o.organizationId === organizationId
        );
        if (idx === -1) return { rows: [] };
        const trailing = values.slice(2);
        const patch: Partial<Opportunity> = {};
        let cursor = 0;
        const cols: Array<[string, keyof Opportunity]> = [
          ["primary_contact_id = $", "primaryContactId"],
          ["name = $", "name"],
          ["stage_id = $", "stageId"],
          ["status = $", "status"],
          ["owner_user_id = $", "ownerUserId"],
          ["team_id = $", "teamId"],
          ["expected_value = $", "expectedValue"],
          ["currency = $", "currency"],
          ["expected_close_date = $", "expectedCloseDate"],
          ["probability_band = $", "probabilityBand"],
          ["service_summary = $", "serviceSummary"],
          ["loss_reason = $", "lossReason"]
        ];
        for (const [marker, key] of cols) {
          if (t.includes(marker)) {
            (patch as Record<string, unknown>)[key] = trailing[cursor];
            cursor += 1;
          }
        }
        opportunities[idx] = {
          ...opportunities[idx]!,
          ...patch,
          updatedAt: "2026-05-23T17:05:00.000Z"
        };
        return { rows: [opportunities[idx]! as unknown as T] };
      }

      if (t.includes("insert into audit_events")) {
        const [, , , action, resourceType, resourceId, beforeSummary, afterSummary] =
          values as [string, string, string, string, string, string, unknown, unknown];
        audits.push({ action, resourceType, resourceId, beforeSummary, afterSummary });
        return { rows: [] };
      }

      if (t.includes("insert into quote_handoffs")) {
        const [orgId, opportunityId, targetType, requestedByUserId] =
          values as [string, string, string, string | null];
        const row = {
          id: `qh_${quoteHandoffs.length + 1}`,
          organizationId: orgId,
          opportunityId,
          targetType,
          status: "pending",
          requestedByUserId: requestedByUserId ?? null,
          acceptedAt: null,
          deletedAt: null,
          createdAt: "2026-05-28T10:00:00.000Z",
          updatedAt: "2026-05-28T10:00:00.000Z"
        };
        quoteHandoffs.push(row);
        return { rows: [row as unknown as T] };
      }

      return { rows: [] };
    }
  };

  return { db, opportunities, audits, quoteHandoffs };
}

const context = { organizationId: "org_1", actorUserId: "user_actor" };

describe("OpportunityService (CRM Demo Slice 2.5)", () => {
  it("creates an opportunity and emits crm.opportunity.created", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createOpportunity(db, context, {
      companyId: "co_1",
      name: "Annual licence renewal",
      stageId: "ps_1"
    });
    expect(created.status).toBe("open");
    const create = audits.find((a) => a.action === "crm.opportunity.created");
    expect(create).toBeDefined();
    expect(create!.resourceId).toBe(created.id);
  });

  it("emits crm.opportunity.stage_changed in addition to .updated when stage changes", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createOpportunity(db, context, {
      companyId: "co_1",
      name: "Demo Slice",
      stageId: "ps_1"
    });
    await updateOpportunity(db, context, created.id, { stageId: "ps_2" });
    const actions = audits.map((a) => a.action);
    expect(actions).toContain("crm.opportunity.updated");
    expect(actions).toContain("crm.opportunity.stage_changed");
  });

  it("emits crm.opportunity.won when status flips to won", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createOpportunity(db, context, {
      companyId: "co_1",
      name: "Won deal",
      stageId: "ps_1"
    });
    await updateOpportunity(db, context, created.id, { status: "won" });
    expect(audits.some((a) => a.action === "crm.opportunity.won")).toBe(true);
  });

  it("auto-raises a QuoteHandoff (crm.quote_handoff.requested) when opportunity transitions to won (DS 2.7)", async () => {
    const { db, audits, quoteHandoffs } = makeFakeDb();
    const created = await createOpportunity(db, context, {
      companyId: "co_1",
      name: "Won deal",
      stageId: "ps_1"
    });
    await updateOpportunity(db, context, created.id, { status: "won" });
    expect(audits.some((a) => a.action === "crm.quote_handoff.requested")).toBe(true);
    expect(quoteHandoffs).toHaveLength(1);
    expect(quoteHandoffs[0]!.opportunityId).toBe(created.id);
    expect(quoteHandoffs[0]!.targetType).toBe("invoice");
    expect(quoteHandoffs[0]!.status).toBe("pending");
  });

  it("rejects closing as lost without loss_reason (business rule, spec line 145)", async () => {
    const { db } = makeFakeDb();
    const created = await createOpportunity(db, context, {
      companyId: "co_1",
      name: "Lost deal",
      stageId: "ps_1"
    });
    await expect(
      updateOpportunity(db, context, created.id, { status: "lost" })
    ).rejects.toBeInstanceOf(LossReasonRequiredError);
  });

  it("emits crm.opportunity.lost when status flips to lost with a reason", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createOpportunity(db, context, {
      companyId: "co_1",
      name: "Lost deal",
      stageId: "ps_1"
    });
    await updateOpportunity(db, context, created.id, {
      status: "lost",
      lossReason: "Budget cut"
    });
    expect(audits.some((a) => a.action === "crm.opportunity.lost")).toBe(true);
  });

  it("throws OpportunityNotFoundError on missing id", async () => {
    const { db } = makeFakeDb();
    await expect(
      updateOpportunity(db, context, "op_nope", { name: "x" })
    ).rejects.toBeInstanceOf(OpportunityNotFoundError);
  });

  it("listOpportunities filters by stageId", async () => {
    const { db } = makeFakeDb();
    await createOpportunity(db, context, { companyId: "co_1", name: "A", stageId: "ps_1" });
    await createOpportunity(db, context, { companyId: "co_1", name: "B", stageId: "ps_2" });
    const scoped = await listOpportunities(db, context, { stageId: "ps_2" });
    expect(scoped.map((o) => o.name)).toEqual(["B"]);
  });

  it("soft-deletes an opportunity: emits crm.opportunity.deleted and hides it from default reads", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createOpportunity(db, context, {
      companyId: "co_1",
      name: "ToDelete",
      stageId: "ps_1"
    });

    await deleteOpportunity(db, context, created.id);

    const deleteAudit = audits.find((a) => a.action === "crm.opportunity.deleted");
    expect(deleteAudit).toBeDefined();
    expect(deleteAudit!.resourceId).toBe(created.id);
    expect(deleteAudit!.beforeSummary).toMatchObject({ name: "ToDelete" });

    const list = await listOpportunities(db, context);
    expect(list.find((o) => o.id === created.id)).toBeUndefined();
  });

  it("throws OpportunityNotFoundError when deleting a non-existent opportunity", async () => {
    const { db } = makeFakeDb();
    await expect(deleteOpportunity(db, context, "op_nope")).rejects.toBeInstanceOf(
      OpportunityNotFoundError
    );
  });
});
