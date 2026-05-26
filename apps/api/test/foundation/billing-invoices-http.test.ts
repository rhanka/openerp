import { describe, expect, it } from "vitest";

import type { Invoice, InvoiceWithLines, BillingMoney, InvoiceStatus } from "@sentropic/openerp-domain/billing";
import type { InvoiceProposal, InvoiceProposalLine } from "@sentropic/openerp-domain/project";

import type { Queryable } from "../../src/db/client";
import { buildApp, headerTenantResolver } from "../../src/http/app";

// Fake DB that simulates invoice + invoice_lines + invoice_proposals.
function makeFakeDb(
  seedProposals: InvoiceProposal[] = [],
  seedProposalLines: InvoiceProposalLine[] = []
) {
  const invoices: Array<Invoice & { _deleted?: boolean }> = [];
  const invoiceLines: Array<InvoiceWithLines["lines"][number]> = [];
  const proposals = [...seedProposals];
  const proposalLines = [...seedProposalLines];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text.trim();

      // count invoices (for invoice number generation)
      if (t.includes("count(*)") && t.includes("from invoices")) {
        return { rows: [{ count: String(invoices.length) } as unknown as T] };
      }

      // INSERT invoices
      if (t.includes("insert into invoices")) {
        const [orgId, companyId, projectId, invoiceProposalId, invoiceNumber, status, currency, subtotal, taxTotal, total, issueDate, dueDate] =
          values as [string, string, string | null, string | null, string, string, string, string, string, string, string | null, string | null];
        const row: Invoice = {
          id: `inv_${invoices.length + 1}`,
          organizationId: orgId,
          companyId,
          projectId,
          invoiceProposalId,
          invoiceNumber,
          status: status as InvoiceStatus,
          currency,
          subtotal: JSON.parse(subtotal) as BillingMoney,
          taxTotal: JSON.parse(taxTotal) as BillingMoney,
          total: JSON.parse(total) as BillingMoney,
          issueDate,
          dueDate,
          issuedAt: null,
          createdAt: "2026-05-25T10:00:00.000Z",
          updatedAt: "2026-05-25T10:00:00.000Z"
        };
        invoices.push(row);
        return { rows: [row as unknown as T] };
      }

      // INSERT invoice_lines
      if (t.includes("insert into invoice_lines")) {
        const [orgId, invoiceId, sourceType, sourceId, description, quantity, unitPrice, amount] =
          values as [string, string, string, string | null, string | null, number, string, string];
        const row = {
          id: `il_${invoiceLines.length + 1}`,
          organizationId: orgId,
          invoiceId,
          sourceType,
          sourceId,
          description,
          quantity,
          unitPrice: JSON.parse(unitPrice) as BillingMoney,
          amount: JSON.parse(amount) as BillingMoney,
          createdAt: "2026-05-25T10:00:00.000Z"
        };
        invoiceLines.push(row);
        return { rows: [row as unknown as T] };
      }

      // SELECT invoices by id
      if (t.includes("from invoices") && t.includes("where id = $1")) {
        const [id, organizationId] = values as [string, string];
        const found = invoices.find(
          (inv) => inv.id === id && inv.organizationId === organizationId && !inv._deleted
        );
        return { rows: found ? [found as unknown as T] : [] };
      }

      // SELECT invoices list
      if (t.includes("from invoices") && t.includes("order by created_at")) {
        const [organizationId] = values as [string];
        const rows = invoices.filter(
          (inv) => inv.organizationId === organizationId && !inv._deleted
        );
        return { rows: rows as unknown as T[] };
      }

      // UPDATE invoices status
      if (t.includes("update invoices") && t.includes("status = $3")) {
        const [id, organizationId, newStatus] = values as [string, string, string];
        const inv = invoices.find(
          (i) => i.id === id && i.organizationId === organizationId && !i._deleted
        );
        if (!inv) return { rows: [] };
        inv.status = newStatus as InvoiceStatus;
        if (t.includes("issued_at")) {
          inv.issuedAt = values[3] as string | null;
        }
        if (t.includes("issue_date")) {
          const dateIdx = t.includes("issued_at") ? 4 : 3;
          inv.issueDate = values[dateIdx] as string | null;
        }
        return { rows: [inv as unknown as T] };
      }

      // soft delete invoices
      if (t.includes("update invoices") && t.includes("deleted_at = now()")) {
        const [id, organizationId] = values as [string, string];
        const inv = invoices.find(
          (i) => i.id === id && i.organizationId === organizationId && !i._deleted
        );
        if (!inv) return { rows: [] };
        inv._deleted = true;
        return { rows: [{ id: inv.id } as unknown as T] };
      }

      // SELECT invoice_lines
      if (t.includes("from invoice_lines") && t.includes("where invoice_id = $1")) {
        const [invoiceId] = values as [string];
        const rows = invoiceLines.filter((l) => l.invoiceId === invoiceId);
        return { rows: rows as unknown as T[] };
      }

      // invoice_proposals find by id
      if (t.includes("from invoice_proposals") && t.includes("where id = $1")) {
        const [id] = values as [string];
        const found = proposals.find((p) => p.id === id);
        return { rows: found ? [found as unknown as T] : [] };
      }

      // invoice_proposal_lines
      if (t.includes("from invoice_proposal_lines")) {
        const [invoiceProposalId] = values as [string];
        const rows = proposalLines.filter((l) => l.invoiceProposalId === invoiceProposalId);
        return { rows: rows as unknown as T[] };
      }

      // audit and timeline — silent sink
      if (t.includes("into audit_events") || t.includes("into timeline_entries")) {
        return { rows: [] };
      }

      return { rows: [] };
    }
  };

  return { db, invoices, invoiceLines };
}

const tenantHeaders = {
  "x-organization-id": "00000000-0000-0000-0000-000000000001",
  "x-user-identity-id": "00000000-0000-0000-0000-000000000aaa"
} as const;

const sampleLine = {
  quantity: 60,
  unitPrice: { amountMinor: 10000, currency: "CAD", scale: 2 },
  amount: { amountMinor: 10000, currency: "CAD", scale: 2 }
};

describe("billing /billing/invoices HTTP surface (DS 4.0)", () => {
  it("requires tenant headers — returns 401 when missing", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/billing/invoices", { method: "GET" });
    expect(res.status).toBe(401);
  });

  it("POST /billing/invoices rejects missing companyId with 400", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/billing/invoices", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ lines: [sampleLine] })
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { errors: Record<string, string> };
    expect(body.errors.companyId).toBe("REQUIRED");
  });

  it("POST /billing/invoices rejects missing lines with 400", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/billing/invoices", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ companyId: "co-1", lines: [] })
    });
    expect(res.status).toBe(400);
  });

  it("POST /billing/invoices returns 201 with invoice + lines", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/billing/invoices", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ companyId: "co-1", lines: [sampleLine] })
    });
    expect(res.status).toBe(201);
    const body = await res.json() as InvoiceWithLines;
    expect(body.status).toBe("draft");
    expect(body.invoiceNumber).toBe("INV-000001");
    expect(Array.isArray(body.lines)).toBe(true);
    expect(body.lines.length).toBe(1);
  });

  it("GET /billing/invoices returns items array", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    await app.request("/billing/invoices", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ companyId: "co-1", lines: [sampleLine] })
    });
    const res = await app.request("/billing/invoices", { headers: tenantHeaders });
    expect(res.status).toBe(200);
    const body = await res.json() as { items: Invoice[] };
    expect(body.items.length).toBeGreaterThanOrEqual(1);
  });

  it("GET /billing/invoices/:id returns 404 for missing invoice", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/billing/invoices/no-such-id", { headers: tenantHeaders });
    expect(res.status).toBe(404);
  });

  it("GET /billing/invoices/:id returns invoice with lines", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const created = (await (
      await app.request("/billing/invoices", {
        method: "POST",
        headers: { "content-type": "application/json", ...tenantHeaders },
        body: JSON.stringify({ companyId: "co-1", lines: [sampleLine] })
      })
    ).json()) as InvoiceWithLines;

    const res = await app.request(`/billing/invoices/${created.id}`, { headers: tenantHeaders });
    expect(res.status).toBe(200);
    const body = await res.json() as InvoiceWithLines;
    expect(body.id).toBe(created.id);
    expect(Array.isArray(body.lines)).toBe(true);
  });

  it("POST /billing/invoices/:id/issue transitions draft -> issued", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const created = (await (
      await app.request("/billing/invoices", {
        method: "POST",
        headers: { "content-type": "application/json", ...tenantHeaders },
        body: JSON.stringify({ companyId: "co-1", lines: [sampleLine] })
      })
    ).json()) as InvoiceWithLines;

    const res = await app.request(`/billing/invoices/${created.id}/issue`, {
      method: "POST",
      headers: tenantHeaders
    });
    expect(res.status).toBe(200);
    expect((await res.json() as Invoice).status).toBe("issued");
  });

  it("POST /billing/invoices/:id/issue returns 409 on double issue (illegal transition)", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const created = (await (
      await app.request("/billing/invoices", {
        method: "POST",
        headers: { "content-type": "application/json", ...tenantHeaders },
        body: JSON.stringify({ companyId: "co-1", lines: [sampleLine] })
      })
    ).json()) as InvoiceWithLines;

    await app.request(`/billing/invoices/${created.id}/issue`, {
      method: "POST",
      headers: tenantHeaders
    });
    const res = await app.request(`/billing/invoices/${created.id}/issue`, {
      method: "POST",
      headers: tenantHeaders
    });
    expect(res.status).toBe(409);
    expect((await res.json() as { code: string }).code).toBe("ILLEGAL_TRANSITION");
  });

  it("POST /billing/invoices/:id/pay returns 200 from issued", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const created = (await (
      await app.request("/billing/invoices", {
        method: "POST",
        headers: { "content-type": "application/json", ...tenantHeaders },
        body: JSON.stringify({ companyId: "co-1", lines: [sampleLine] })
      })
    ).json()) as InvoiceWithLines;

    await app.request(`/billing/invoices/${created.id}/issue`, {
      method: "POST",
      headers: tenantHeaders
    });
    const res = await app.request(`/billing/invoices/${created.id}/pay`, {
      method: "POST",
      headers: tenantHeaders
    });
    expect(res.status).toBe(200);
    expect((await res.json() as Invoice).status).toBe("paid");
  });

  it("POST /billing/invoices/:id/void returns 200 from draft", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const created = (await (
      await app.request("/billing/invoices", {
        method: "POST",
        headers: { "content-type": "application/json", ...tenantHeaders },
        body: JSON.stringify({ companyId: "co-1", lines: [sampleLine] })
      })
    ).json()) as InvoiceWithLines;

    const res = await app.request(`/billing/invoices/${created.id}/void`, {
      method: "POST",
      headers: tenantHeaders
    });
    expect(res.status).toBe(200);
    expect((await res.json() as Invoice).status).toBe("void");
  });

  it("DELETE /billing/invoices/:id returns 204 on draft delete", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const created = (await (
      await app.request("/billing/invoices", {
        method: "POST",
        headers: { "content-type": "application/json", ...tenantHeaders },
        body: JSON.stringify({ companyId: "co-1", lines: [sampleLine] })
      })
    ).json()) as InvoiceWithLines;

    const res = await app.request(`/billing/invoices/${created.id}`, {
      method: "DELETE",
      headers: tenantHeaders
    });
    expect(res.status).toBe(204);
  });

  it("DELETE /billing/invoices/:id returns 404 for missing invoice", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/billing/invoices/nope", {
      method: "DELETE",
      headers: tenantHeaders
    });
    expect(res.status).toBe(404);
  });

  it("DELETE /billing/invoices/:id returns 409 when not draft", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const created = (await (
      await app.request("/billing/invoices", {
        method: "POST",
        headers: { "content-type": "application/json", ...tenantHeaders },
        body: JSON.stringify({ companyId: "co-1", lines: [sampleLine] })
      })
    ).json()) as InvoiceWithLines;

    await app.request(`/billing/invoices/${created.id}/issue`, {
      method: "POST",
      headers: tenantHeaders
    });
    const res = await app.request(`/billing/invoices/${created.id}`, {
      method: "DELETE",
      headers: tenantHeaders
    });
    expect(res.status).toBe(409);
  });

  it("POST /billing/invoices/from-proposal returns 400 for missing invoiceProposalId", async () => {
    const { db } = makeFakeDb();
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/billing/invoices/from-proposal", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({})
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { errors: Record<string, string> };
    expect(body.errors.invoiceProposalId).toBe("REQUIRED");
  });

  it("POST /billing/invoices/from-proposal returns 409 for non-approved proposal", async () => {
    const proposal: InvoiceProposal = {
      id: "prop-draft",
      organizationId: "00000000-0000-0000-0000-000000000001",
      projectId: "proj-1",
      companyId: "co-1",
      status: "submitted",
      periodStart: null,
      periodEnd: null,
      total: { amountMinor: 5000, currency: "CAD", scale: 2 },
      currency: "CAD",
      submittedAt: null,
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z"
    };
    const { db } = makeFakeDb([proposal]);
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/billing/invoices/from-proposal", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ invoiceProposalId: "prop-draft" })
    });
    expect(res.status).toBe(409);
    expect((await res.json() as { code: string }).code).toBe("PROPOSAL_NOT_APPROVED");
  });

  it("POST /billing/invoices/from-proposal returns 201 with lines from approved proposal", async () => {
    const proposal: InvoiceProposal = {
      id: "prop-approved",
      organizationId: "00000000-0000-0000-0000-000000000001",
      projectId: "proj-1",
      companyId: "co-1",
      status: "approved",
      periodStart: null,
      periodEnd: null,
      total: { amountMinor: 15000, currency: "CAD", scale: 2 },
      currency: "CAD",
      submittedAt: "2026-05-01T00:00:00.000Z",
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z"
    };
    const pLine: InvoiceProposalLine = {
      id: "pl-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      invoiceProposalId: "prop-approved",
      sourceType: "time_entry",
      sourceId: "te-1",
      description: "Dev work",
      quantityMinutes: 90,
      unitRate: { amountMinor: 10000, currency: "CAD", scale: 2 },
      amount: { amountMinor: 15000, currency: "CAD", scale: 2 },
      createdAt: "2026-05-01T00:00:00.000Z"
    };
    const { db } = makeFakeDb([proposal], [pLine]);
    const app = buildApp({ db, resolveTenant: headerTenantResolver });
    const res = await app.request("/billing/invoices/from-proposal", {
      method: "POST",
      headers: { "content-type": "application/json", ...tenantHeaders },
      body: JSON.stringify({ invoiceProposalId: "prop-approved" })
    });
    expect(res.status).toBe(201);
    const body = await res.json() as InvoiceWithLines;
    expect(body.invoiceProposalId).toBe("prop-approved");
    expect(body.total.amountMinor).toBe(15000);
    expect(body.lines).toHaveLength(1);
    expect(body.lines[0]!.sourceType).toBe("invoice_proposal_line");
  });
});
