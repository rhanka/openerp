import { describe, expect, it } from "vitest";

import type { InvoiceProposal, InvoiceProposalLine, InvoiceProposalWithLines } from "@sentropic/openerp-domain/project";

import type { Queryable } from "../../src/db/client";
import { buildApp, headerTenantResolver } from "../../src/http/app";

// Fake DB that simulates the invoice_proposals + invoice_proposal_lines tables.
// Reproduces the minimum SQL pattern matching used by the repo layer.
function makeFakeDb() {
  const proposals: Array<InvoiceProposal & { _deleted?: boolean }> = [];
  const lines: InvoiceProposalLine[] = [];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text.trim();

      // Project lookup (used in generateInvoiceProposal)
      if (t.includes("from projects") && t.includes("where id = $1")) {
        return { rows: [{ companyId: null } as unknown as T] };
      }

      // Time entries (return empty — no approved entries in this fake, so generate returns empty)
      if (t.includes("from time_entries")) {
        return { rows: [] };
      }

      // Assignments (return empty)
      if (t.includes("from assignments")) {
        return { rows: [] };
      }

      // Rates (return empty fallback)
      if (t.includes("from rates")) {
        return { rows: [] };
      }

      // Audit events — silent sink
      if (t.includes("into audit_events")) {
        return { rows: [] };
      }

      // Timeline entries — silent sink
      if (t.includes("into timeline_entries")) {
        return { rows: [] };
      }

      // INSERT invoice_proposals
      if (t.includes("insert into invoice_proposals")) {
        const [organizationId, projectId, companyId, status, periodStart, periodEnd, totalJson, currency] =
          values as [string, string, string | null, string, string | null, string | null, string, string];
        const row: InvoiceProposal = {
          id: `prop_${proposals.length + 1}`,
          organizationId,
          projectId,
          companyId,
          status: status as InvoiceProposal["status"],
          periodStart,
          periodEnd,
          total: JSON.parse(totalJson),
          currency,
          submittedAt: null,
          createdAt: "2026-05-25T08:00:00.000Z",
          updatedAt: "2026-05-25T08:00:00.000Z"
        };
        proposals.push(row);
        return { rows: [row as unknown as T] };
      }

      // INSERT invoice_proposal_lines
      if (t.includes("insert into invoice_proposal_lines")) {
        const [organizationId, invoiceProposalId, sourceType, sourceId, description, quantityMinutes, unitRateJson, amountJson] =
          values as [string, string, string, string | null, string | null, number, string, string];
        const row: InvoiceProposalLine = {
          id: `line_${lines.length + 1}`,
          organizationId,
          invoiceProposalId,
          sourceType,
          sourceId,
          description,
          quantityMinutes,
          unitRate: JSON.parse(unitRateJson),
          amount: JSON.parse(amountJson),
          createdAt: "2026-05-25T08:00:00.000Z"
        };
        lines.push(row);
        return { rows: [row as unknown as T] };
      }

      // SELECT invoice_proposals (list)
      if (t.includes("from invoice_proposals") && t.includes("order by created_at desc")) {
        const [organizationId, projectIdFilter, statusFilter, limit, offset] = values as [
          string, string | null, string | null, number, number
        ];
        const filtered = proposals
          .filter((p) => p.organizationId === organizationId && !p._deleted)
          .filter((p) => (projectIdFilter ? p.projectId === projectIdFilter : true))
          .filter((p) => (statusFilter ? p.status === statusFilter : true))
          .slice(Number(offset), Number(offset) + Number(limit));
        return { rows: filtered as unknown as T[] };
      }

      // SELECT invoice_proposals (by id)
      if (t.includes("from invoice_proposals") && t.includes("where id = $1")) {
        const [id, organizationId] = values as [string, string];
        const found = proposals.find(
          (p) => p.id === id && p.organizationId === organizationId && !p._deleted
        );
        return { rows: found ? [found as unknown as T] : [] };
      }

      // UPDATE invoice_proposals status
      if (t.includes("update invoice_proposals") && t.includes("status = $3")) {
        const [id, organizationId, status] = values as [string, string, string];
        const idx = proposals.findIndex(
          (p) => p.id === id && p.organizationId === organizationId && !p._deleted
        );
        if (idx === -1) return { rows: [] };
        proposals[idx] = {
          ...proposals[idx]!,
          status: status as InvoiceProposal["status"],
          submittedAt: status === "submitted" ? "2026-05-25T08:05:00.000Z" : proposals[idx]!.submittedAt,
          updatedAt: "2026-05-25T08:05:00.000Z"
        };
        return { rows: [proposals[idx]! as unknown as T] };
      }

      // UPDATE soft-delete invoice_proposals
      if (t.includes("update invoice_proposals") && t.includes("deleted_at = now()")) {
        const [id, organizationId] = values as [string, string];
        const idx = proposals.findIndex(
          (p) => p.id === id && p.organizationId === organizationId && !p._deleted
        );
        if (idx === -1) return { rows: [] };
        proposals[idx]!._deleted = true;
        return { rows: [{ id: proposals[idx]!.id } as unknown as T] };
      }

      // SELECT invoice_proposal_lines
      if (t.includes("from invoice_proposal_lines")) {
        const [invoiceProposalId, organizationId] = values as [string, string];
        const filtered = lines.filter(
          (l) => l.invoiceProposalId === invoiceProposalId && l.organizationId === organizationId
        );
        return { rows: filtered as unknown as T[] };
      }

      return { rows: [] };
    }
  };

  return { db, proposals, lines };
}

const tenantHeaders = {
  "x-organization-id": "00000000-0000-0000-0000-000000000001",
  "x-user-identity-id": "00000000-0000-0000-0000-000000000aaa"
} as const;

describe("project /project/invoice-proposals HTTP surface (DS 3.4)", () => {
  it("POST /project/invoice-proposals/generate rejects missing projectId with 400", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/project/invoice-proposals/generate", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ periodStart: "2026-01-01" })
    });
    expect(res.status).toBe(400);
    expect((await res.json() as { errors: Record<string, string> }).errors.projectId).toBe("REQUIRED");
  });

  it("POST /project/invoice-proposals/generate returns 201 with lines", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/project/invoice-proposals/generate", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ projectId: "proj_1", currency: "CAD" })
    });
    expect(res.status).toBe(201);
    const body = await res.json() as InvoiceProposalWithLines;
    expect(body.projectId).toBe("proj_1");
    expect(body.status).toBe("draft");
    expect(Array.isArray(body.lines)).toBe(true);
  });

  it("GET /project/invoice-proposals returns items array", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    await app.request("/project/invoice-proposals/generate", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ projectId: "proj_1" })
    });
    const res = await app.request("/project/invoice-proposals", { headers: tenantHeaders });
    expect(res.status).toBe(200);
    const body = await res.json() as { items: InvoiceProposal[] };
    expect(body.items.length).toBeGreaterThanOrEqual(1);
  });

  it("GET /project/invoice-proposals/:id returns 404 for missing proposal", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/project/invoice-proposals/nope", { headers: tenantHeaders });
    expect(res.status).toBe(404);
  });

  it("GET /project/invoice-proposals/:id returns proposal with lines", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const created = (await (
      await app.request("/project/invoice-proposals/generate", {
        method: "POST",
        headers: { "content-type": "application/json", ...tenantHeaders },
        body: JSON.stringify({ projectId: "proj_1" })
      })
    ).json()) as InvoiceProposalWithLines;
    const res = await app.request(`/project/invoice-proposals/${created.id}`, { headers: tenantHeaders });
    expect(res.status).toBe(200);
    const body = await res.json() as InvoiceProposalWithLines;
    expect(body.id).toBe(created.id);
    expect(Array.isArray(body.lines)).toBe(true);
  });

  it("POST /project/invoice-proposals/:id/submit transitions draft → submitted", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const created = (await (
      await app.request("/project/invoice-proposals/generate", {
        method: "POST",
        headers: { "content-type": "application/json", ...tenantHeaders },
        body: JSON.stringify({ projectId: "proj_1" })
      })
    ).json()) as InvoiceProposalWithLines;

    const res = await app.request(`/project/invoice-proposals/${created.id}/submit`, {
      method: "POST",
      headers: tenantHeaders
    });
    expect(res.status).toBe(200);
    const body = await res.json() as InvoiceProposal;
    expect(body.status).toBe("submitted");
  });

  it("POST /project/invoice-proposals/:id/approve returns 409 on draft (illegal transition)", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const created = (await (
      await app.request("/project/invoice-proposals/generate", {
        method: "POST",
        headers: { "content-type": "application/json", ...tenantHeaders },
        body: JSON.stringify({ projectId: "proj_1" })
      })
    ).json()) as InvoiceProposalWithLines;

    const res = await app.request(`/project/invoice-proposals/${created.id}/approve`, {
      method: "POST",
      headers: tenantHeaders
    });
    expect(res.status).toBe(409);
    expect((await res.json() as { code: string }).code).toBe("ILLEGAL_TRANSITION");
  });

  it("POST /project/invoice-proposals/:id/submit then /approve succeeds", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const created = (await (
      await app.request("/project/invoice-proposals/generate", {
        method: "POST",
        headers: { "content-type": "application/json", ...tenantHeaders },
        body: JSON.stringify({ projectId: "proj_1" })
      })
    ).json()) as InvoiceProposalWithLines;

    await app.request(`/project/invoice-proposals/${created.id}/submit`, {
      method: "POST",
      headers: tenantHeaders
    });
    const res = await app.request(`/project/invoice-proposals/${created.id}/approve`, {
      method: "POST",
      headers: tenantHeaders
    });
    expect(res.status).toBe(200);
    expect((await res.json() as InvoiceProposal).status).toBe("approved");
  });

  it("POST /project/invoice-proposals/:id/reject returns 409 on draft", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const created = (await (
      await app.request("/project/invoice-proposals/generate", {
        method: "POST",
        headers: { "content-type": "application/json", ...tenantHeaders },
        body: JSON.stringify({ projectId: "proj_1" })
      })
    ).json()) as InvoiceProposalWithLines;

    const res = await app.request(`/project/invoice-proposals/${created.id}/reject`, {
      method: "POST",
      headers: tenantHeaders
    });
    expect(res.status).toBe(409);
  });

  it("DELETE /project/invoice-proposals/:id returns 204 on success", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const created = (await (
      await app.request("/project/invoice-proposals/generate", {
        method: "POST",
        headers: { "content-type": "application/json", ...tenantHeaders },
        body: JSON.stringify({ projectId: "proj_1" })
      })
    ).json()) as InvoiceProposalWithLines;

    const res = await app.request(`/project/invoice-proposals/${created.id}`, {
      method: "DELETE",
      headers: tenantHeaders
    });
    expect(res.status).toBe(204);
  });

  it("DELETE /project/invoice-proposals/:id returns 404 for missing", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/project/invoice-proposals/nope", {
      method: "DELETE",
      headers: tenantHeaders
    });
    expect(res.status).toBe(404);
  });

  it("requires tenant headers — returns 401 when missing", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/project/invoice-proposals", { method: "GET" });
    expect(res.status).toBe(401);
  });
});
