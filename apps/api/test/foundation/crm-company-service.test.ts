import { describe, expect, it } from "vitest";

import type { Company } from "@sentropic/openerp-domain/crm";

import type { Queryable } from "../../src/db/client";
import {
  CompanyNotFoundError,
  createCompany,
  listCompanies,
  updateCompany
} from "../../src/crm/company-service";

interface AuditRow {
  organizationId: string;
  actorUserId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  beforeSummary: unknown;
  afterSummary: unknown;
}

function makeFakeDb() {
  const companies: Company[] = [];
  const audits: AuditRow[] = [];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;

      if (t.includes("insert into companies")) {
        const [
          organizationId,
          displayName,
          legalName,
          ownerUserId,
          teamId,
          website,
          phone,
          email,
          language,
          taxRegion,
          billingAddress,
          shippingAddress
        ] = values as [
          string,
          string,
          string | null,
          string | null,
          string | null,
          string | null,
          string | null,
          string | null,
          "en" | "fr" | null,
          string | null,
          unknown,
          unknown
        ];
        const row: Company = {
          id: `co_${companies.length + 1}`,
          organizationId,
          displayName,
          legalName,
          status: "active",
          ownerUserId,
          teamId,
          website,
          phone,
          email,
          language,
          taxRegion,
          billingAddress: billingAddress as Company["billingAddress"],
          shippingAddress: shippingAddress as Company["shippingAddress"],
          createdAt: "2026-05-23T08:00:00.000Z",
          updatedAt: "2026-05-23T08:00:00.000Z"
        };
        companies.push(row);
        return { rows: [row as unknown as T] };
      }

      if (t.includes("from companies") && t.includes("where id = $1")) {
        const [id, organizationId] = values as [string, string];
        const found = companies.find((c) => c.id === id && c.organizationId === organizationId);
        return { rows: found ? [found as unknown as T] : [] };
      }

      if (t.includes("from companies") && t.includes("order by display_name")) {
        const [organizationId, status, limit, offset] = values as [
          string,
          string | null,
          number,
          number
        ];
        const filtered = companies
          .filter((c) => c.organizationId === organizationId)
          .filter((c) => (status ? c.status === status : true))
          .sort((a, b) => a.displayName.localeCompare(b.displayName))
          .slice(offset, offset + limit);
        return { rows: filtered as unknown as T[] };
      }

      if (t.includes("update companies")) {
        const [id, organizationId] = values as [string, string];
        const idx = companies.findIndex((c) => c.id === id && c.organizationId === organizationId);
        if (idx === -1) return { rows: [] };
        // The dynamic UPDATE drives subsequent $i values from the patch. The
        // fake just bumps updated_at and copies the literal display_name from
        // the trailing positional values, which is sufficient for the test
        // expectations below.
        const trailing = values.slice(2);
        const patch: Partial<Company> = {};
        const colOrder = [
          "displayName",
          "legalName",
          "status",
          "ownerUserId",
          "teamId",
          "website",
          "phone",
          "email",
          "language",
          "taxRegion",
          "billingAddress",
          "shippingAddress"
        ] as const;
        // pg-smoke covers the precise mapping; here we just verify that
        // displayName, when present, lands on the row.
        // The dynamic SQL appends fields in declaration order; the test only
        // exercises displayName/status to keep coverage tight.
        if (t.includes("display_name = $")) {
          patch.displayName = trailing[0] as string;
        }
        if (t.includes("status = $")) {
          // status placeholder may not be at index 0 if displayName was also
          // patched. We just look for a value matching the status whitelist.
          const candidate = trailing.find((v) => v === "active" || v === "archived");
          if (candidate) patch.status = candidate as Company["status"];
        }
        companies[idx] = { ...companies[idx]!, ...patch, updatedAt: "2026-05-23T08:05:00.000Z" };
        return { rows: [companies[idx]! as unknown as T] };
      }

      if (t.includes("insert into audit_events")) {
        const [organizationId, actorUserId, action, resourceId, beforeSummary, afterSummary] =
          values as [string, string, string, string, unknown, unknown];
        audits.push({
          organizationId,
          actorUserId,
          action,
          resourceType: "company",
          resourceId,
          beforeSummary,
          afterSummary
        });
        return { rows: [] };
      }

      return { rows: [] };
    }
  };

  return { db, companies, audits };
}

const context = { organizationId: "org_1", actorUserId: "user_actor" };

describe("CompanyService (CRM Demo Slice 2)", () => {
  it("creates a company and emits crm.company.created", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createCompany(db, context, { displayName: "Northwind" });
    expect(created.displayName).toBe("Northwind");
    expect(created.status).toBe("active");
    expect(audits).toHaveLength(1);
    expect(audits[0]!.action).toBe("crm.company.created");
    expect(audits[0]!.resourceId).toBe(created.id);
    expect(audits[0]!.afterSummary).toMatchObject({ displayName: "Northwind", status: "active" });
  });

  it("updates a company and emits crm.company.updated with before/after", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createCompany(db, context, { displayName: "Northwind" });
    const updated = await updateCompany(db, context, created.id, { displayName: "Northwind Inc." });
    expect(updated.displayName).toBe("Northwind Inc.");
    const updateAudit = audits.find((a) => a.action === "crm.company.updated");
    expect(updateAudit).toBeDefined();
    expect(updateAudit!.beforeSummary).toMatchObject({ displayName: "Northwind" });
    expect(updateAudit!.afterSummary).toMatchObject({ displayName: "Northwind Inc." });
  });

  it("throws CompanyNotFoundError on missing id", async () => {
    const { db } = makeFakeDb();
    await expect(
      updateCompany(db, context, "co_nope", { displayName: "X" })
    ).rejects.toBeInstanceOf(CompanyNotFoundError);
  });

  it("lists companies ordered by display name with status filter", async () => {
    const { db } = makeFakeDb();
    await createCompany(db, context, { displayName: "Bravo" });
    await createCompany(db, context, { displayName: "Alpha" });
    const list = await listCompanies(db, context);
    expect(list.map((c) => c.displayName)).toEqual(["Alpha", "Bravo"]);

    const archived = await listCompanies(db, context, { status: "archived" });
    expect(archived).toEqual([]);
  });
});
