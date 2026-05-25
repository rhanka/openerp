import { describe, expect, it } from "vitest";

import type { Lead } from "@sentropic/openerp-domain/crm";

import type { Queryable } from "../../src/db/client";
import {
  LeadNotFoundError,
  createLead,
  deleteLead,
  listLeads,
  updateLead
} from "../../src/crm/lead-service";

interface AuditRow {
  action: string;
  resourceType: string;
  resourceId: string;
  beforeSummary: unknown;
  afterSummary: unknown;
}

function makeFakeDb() {
  const leads: Lead[] = [];
  const audits: AuditRow[] = [];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;

      if (t.includes("insert into leads")) {
        const [
          organizationId,
          source,
          displayName,
          companyName,
          contactName,
          email,
          phone,
          description,
          ownerUserId,
          teamId
        ] = values as [
          string,
          string | null,
          string,
          string | null,
          string | null,
          string | null,
          string | null,
          string | null,
          string | null,
          string | null
        ];
        const row: Lead = {
          id: `lead_${leads.length + 1}`,
          organizationId,
          source,
          displayName,
          companyName,
          contactName,
          email,
          phone,
          description,
          status: "new",
          ownerUserId,
          teamId,
          convertedAt: null,
          convertedCompanyId: null,
          convertedContactId: null,
          convertedOpportunityId: null,
          createdAt: "2026-05-25T09:00:00.000Z",
          updatedAt: "2026-05-25T09:00:00.000Z"
        };
        leads.push(row);
        return { rows: [row as unknown as T] };
      }

      if (t.includes("from leads") && t.includes("where id = $1")) {
        const [id, organizationId] = values as [string, string];
        const found = leads.find(
          (l) =>
            l.id === id &&
            l.organizationId === organizationId &&
            !(l as unknown as { _deleted?: boolean })._deleted
        );
        return { rows: found ? [found as unknown as T] : [] };
      }

      if (t.includes("from leads") && t.includes("order by created_at desc")) {
        const [organizationId, status, limit, offset] = values as [
          string,
          string | null,
          number,
          number
        ];
        const filtered = leads
          .filter((l) => l.organizationId === organizationId)
          .filter((l) => !(l as unknown as { _deleted?: boolean })._deleted)
          .filter((l) => (status ? l.status === status : true))
          .slice(offset, offset + limit);
        return { rows: filtered as unknown as T[] };
      }

      if (t.includes("update leads") && t.includes("deleted_at = now()")) {
        const [id, organizationId] = values as [string, string];
        const idx = leads.findIndex(
          (l) =>
            l.id === id &&
            l.organizationId === organizationId &&
            !(l as unknown as { _deleted?: boolean })._deleted
        );
        if (idx === -1) return { rows: [] };
        (leads[idx] as unknown as { _deleted: boolean })._deleted = true;
        return { rows: [{ id: leads[idx]!.id } as unknown as T] };
      }

      if (t.includes("update leads")) {
        const [id, organizationId] = values as [string, string];
        const idx = leads.findIndex((l) => l.id === id && l.organizationId === organizationId);
        if (idx === -1) return { rows: [] };
        const trailing = values.slice(2);
        const patch: Partial<Lead> = {};
        if (t.includes("display_name = $")) {
          patch.displayName = String(trailing[0]);
        }
        if (t.includes("status = $")) {
          const statusValue = trailing.find(
            (v) => v === "new" || v === "working" || v === "converted" || v === "disqualified"
          );
          if (statusValue !== undefined) patch.status = statusValue as Lead["status"];
        }
        leads[idx] = { ...leads[idx]!, ...patch, updatedAt: "2026-05-25T09:05:00.000Z" };
        return { rows: [leads[idx]! as unknown as T] };
      }

      if (t.includes("insert into audit_events")) {
        const [, , , action, resourceType, resourceId, beforeSummary, afterSummary] = values as [
          string,
          string,
          string,
          string,
          string,
          string,
          unknown,
          unknown
        ];
        audits.push({ action, resourceType, resourceId, beforeSummary, afterSummary });
        return { rows: [] };
      }

      if (t.includes("insert into timeline_entries")) {
        return { rows: [] };
      }

      return { rows: [] };
    }
  };

  return { db, leads, audits };
}

const context = { organizationId: "org_1", actorUserId: "user_actor" };

describe("LeadService (CRM Demo Slice 2.4 + 2.3)", () => {
  it("creates a lead and emits crm.lead.created", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createLead(db, context, {
      displayName: "Acme prospect",
      source: "web_form"
    });
    expect(created.status).toBe("new");
    expect(created.displayName).toBe("Acme prospect");
    const createAudit = audits.find((a) => a.action === "crm.lead.created");
    expect(createAudit).toBeDefined();
    expect(createAudit!.resourceId).toBe(created.id);
  });

  it("updates a lead and emits crm.lead.updated with before/after", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createLead(db, context, { displayName: "Raw Lead" });
    const updated = await updateLead(db, context, created.id, {
      displayName: "Qualified Lead",
      status: "working"
    });
    expect(updated.displayName).toBe("Qualified Lead");
    const updateAudit = audits.find((a) => a.action === "crm.lead.updated");
    expect(updateAudit).toBeDefined();
    expect(updateAudit!.beforeSummary).toMatchObject({ displayName: "Raw Lead" });
  });

  it("throws LeadNotFoundError on update with missing id", async () => {
    const { db } = makeFakeDb();
    await expect(
      updateLead(db, context, "lead_nope", { displayName: "X" })
    ).rejects.toBeInstanceOf(LeadNotFoundError);
  });

  it("lists leads, filtering by status", async () => {
    const { db } = makeFakeDb();
    await createLead(db, context, { displayName: "Lead A" });
    await createLead(db, context, { displayName: "Lead B" });
    const all = await listLeads(db, context);
    expect(all).toHaveLength(2);

    const working = await listLeads(db, context, { status: "working" });
    expect(working).toHaveLength(0);
  });

  it("soft-deletes a lead: emits crm.lead.deleted and hides it from default reads", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createLead(db, context, { displayName: "ToDelete" });

    await deleteLead(db, context, created.id);

    const deleteAudit = audits.find((a) => a.action === "crm.lead.deleted");
    expect(deleteAudit).toBeDefined();
    expect(deleteAudit!.resourceId).toBe(created.id);
    expect(deleteAudit!.beforeSummary).toMatchObject({ displayName: "ToDelete" });

    const list = await listLeads(db, context);
    expect(list.find((l) => l.id === created.id)).toBeUndefined();
  });

  it("throws LeadNotFoundError when deleting a non-existent lead", async () => {
    const { db } = makeFakeDb();
    await expect(deleteLead(db, context, "lead_nope")).rejects.toBeInstanceOf(LeadNotFoundError);
  });
});
