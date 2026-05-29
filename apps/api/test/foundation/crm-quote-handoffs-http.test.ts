import { describe, expect, it } from "vitest";

import type { Invoice, InvoiceLine, BillingMoney, InvoiceStatus } from "@sentropic/openerp-domain/billing";
import type { QuoteHandoff, Opportunity } from "@sentropic/openerp-domain/crm";
import type { InvoiceProposal, InvoiceProposalLine } from "@sentropic/openerp-domain/project";
import type { Queryable } from "../../src/db/client";
import { buildApp, headerTenantResolver } from "../../src/http/app";

// Minimal fake DB covering quote_handoffs + opportunities + invoices endpoints.
function makeFakeDb(
  initHandoffs: QuoteHandoff[] = [],
  initOpportunities: Opportunity[] = []
) {
  const handoffs = initHandoffs.map((h) => ({ ...h }));
  const opportunities = [...initOpportunities];
  const invoices: Invoice[] = [];
  const invoiceLines: InvoiceLine[] = [];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text.trim();

      // count invoices
      if (t.includes("count(*)") && t.includes("from invoices")) {
        return { rows: [{ count: String(invoices.length) } as unknown as T] };
      }

      // insert invoice
      if (t.includes("insert into invoices")) {
        const [orgId, companyId, projectId, invoiceProposalId, invoiceNumber, status, currency, subtotal, taxTotal, total] =
          values as [string, string, string | null, string | null, string, string, string, string, string, string];
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
          taxCategoryId: null,
          taxBreakdown: null,
          issueDate: null,
          dueDate: null,
          issuedAt: null,
          createdAt: "2026-05-28T10:00:00.000Z",
          updatedAt: "2026-05-28T10:00:00.000Z"
        };
        invoices.push(row);
        return { rows: [row as unknown as T] };
      }

      // insert invoice_lines
      if (t.includes("insert into invoice_lines")) {
        const [orgId, invoiceId, sourceType, sourceId, description, quantity, unitPrice, amount] =
          values as [string, string, string, string | null, string | null, number, string, string];
        const row: InvoiceLine = {
          id: `il_${invoiceLines.length + 1}`,
          organizationId: orgId,
          invoiceId,
          sourceType,
          sourceId,
          description,
          quantity,
          unitPrice: JSON.parse(unitPrice) as BillingMoney,
          amount: JSON.parse(amount) as BillingMoney,
          createdAt: "2026-05-28T10:00:00.000Z"
        };
        invoiceLines.push(row);
        return { rows: [row as unknown as T] };
      }

      // find quote_handoff by id
      if (t.includes("from quote_handoffs") && t.includes("where id = $1")) {
        const [id, orgId] = values as [string, string];
        const found = handoffs.find((h) => h.id === id && h.organizationId === orgId && !h.deletedAt);
        return { rows: found ? [found as unknown as T] : [] };
      }

      // list quote_handoffs
      if (t.includes("from quote_handoffs") && t.includes("order by created_at")) {
        const [orgId] = values as [string];
        const rows = handoffs.filter((h) => h.organizationId === orgId && !h.deletedAt);
        return { rows: rows as unknown as T[] };
      }

      // update quote_handoff status
      if (t.includes("update quote_handoffs") && t.includes("status = $3")) {
        const [id, orgId, newStatus] = values as [string, string, string];
        const h = handoffs.find((x) => x.id === id && x.organizationId === orgId && !x.deletedAt);
        if (!h) return { rows: [] };
        h.status = newStatus as QuoteHandoff["status"];
        if (t.includes("accepted_at")) {
          h.acceptedAt = values[3] as string;
        }
        return { rows: [h as unknown as T] };
      }

      // find opportunity
      if (t.includes("from opportunities") && t.includes("where id = $1")) {
        const [id, orgId] = values as [string, string];
        const found = opportunities.find((o) => o.id === id && o.organizationId === orgId);
        return { rows: found ? [found as unknown as T] : [] };
      }

      // audit_events, timeline_entries
      if (t.includes("insert into audit_events") || t.includes("insert into timeline_entries")) {
        return { rows: [{ id: "x" } as unknown as T] };
      }

      // invoice_proposals (not used but referenced by billing-invoices handler)
      if (t.includes("from invoice_proposals")) {
        return { rows: [] };
      }

      // invoice_proposal_lines
      if (t.includes("from invoice_proposal_lines")) {
        return { rows: [] };
      }

      return { rows: [] };
    }
  };

  return { db, handoffs, opportunities };
}

const TENANT_HEADERS = {
  "x-organization-id": "org-1",
  "x-user-identity-id": "user-1"
};

function makeHandoff(overrides: Partial<QuoteHandoff> = {}): QuoteHandoff {
  return {
    id: "qh-1",
    organizationId: "org-1",
    opportunityId: "opp-1",
    targetType: "invoice",
    status: "pending",
    requestedByUserId: "user-1",
    acceptedAt: null,
    deletedAt: null,
    createdAt: "2026-05-28T10:00:00.000Z",
    updatedAt: "2026-05-28T10:00:00.000Z",
    ...overrides
  };
}

function makeOpportunity(): Opportunity {
  return {
    id: "opp-1",
    organizationId: "org-1",
    companyId: "co-1",
    primaryContactId: null,
    name: "Annual SaaS licence",
    stageId: "stage-1",
    status: "won",
    ownerUserId: null,
    teamId: null,
    expectedValue: { amountMinor: 500000, currency: "CAD", scale: 2 },
    currency: "CAD",
    expectedCloseDate: null,
    probabilityBand: null,
    serviceSummary: null,
    lossReason: null,
    createdAt: "2026-05-28T10:00:00.000Z",
    updatedAt: "2026-05-28T10:00:00.000Z"
  };
}

describe("CRM QuoteHandoff HTTP endpoints (DS 2.7)", () => {
  it("GET /crm/quote-handoffs — 200 with items list", async () => {
    const handoff = makeHandoff();
    const { db } = makeFakeDb([handoff]);
    const app = buildApp({ db, resolveTenant: (req) => headerTenantResolver(req) });

    const res = await app.request("/crm/quote-handoffs", { headers: TENANT_HEADERS });
    expect(res.status).toBe(200);
    const body = await res.json() as { items: unknown[] };
    expect(body.items).toHaveLength(1);
  });

  it("GET /crm/quote-handoffs/:id — 200 for existing", async () => {
    const handoff = makeHandoff();
    const { db } = makeFakeDb([handoff]);
    const app = buildApp({ db, resolveTenant: (req) => headerTenantResolver(req) });

    const res = await app.request("/crm/quote-handoffs/qh-1", { headers: TENANT_HEADERS });
    expect(res.status).toBe(200);
    const body = await res.json() as QuoteHandoff;
    expect(body.id).toBe("qh-1");
    expect(body.status).toBe("pending");
  });

  it("GET /crm/quote-handoffs/:id — 404 for unknown", async () => {
    const { db } = makeFakeDb([]);
    const app = buildApp({ db, resolveTenant: (req) => headerTenantResolver(req) });

    const res = await app.request("/crm/quote-handoffs/no-such", { headers: TENANT_HEADERS });
    expect(res.status).toBe(404);
  });

  it("POST /crm/quote-handoffs/:id/accept — 200 transitions pending -> accepted", async () => {
    const handoff = makeHandoff();
    const { db } = makeFakeDb([handoff]);
    const app = buildApp({ db, resolveTenant: (req) => headerTenantResolver(req) });

    const res = await app.request("/crm/quote-handoffs/qh-1/accept", {
      method: "POST",
      headers: { ...TENANT_HEADERS, "Content-Type": "application/json" }
    });
    expect(res.status).toBe(200);
    const body = await res.json() as QuoteHandoff;
    expect(body.status).toBe("accepted");
  });

  it("POST /crm/quote-handoffs/:id/accept — 404 for unknown", async () => {
    const { db } = makeFakeDb([]);
    const app = buildApp({ db, resolveTenant: (req) => headerTenantResolver(req) });

    const res = await app.request("/crm/quote-handoffs/no-such/accept", {
      method: "POST",
      headers: { ...TENANT_HEADERS, "Content-Type": "application/json" }
    });
    expect(res.status).toBe(404);
  });

  it("POST /crm/quote-handoffs/:id/accept — 409 when already accepted", async () => {
    const handoff = makeHandoff({ status: "accepted", acceptedAt: "2026-05-28T10:00:00.000Z" });
    const { db } = makeFakeDb([handoff]);
    const app = buildApp({ db, resolveTenant: (req) => headerTenantResolver(req) });

    const res = await app.request("/crm/quote-handoffs/qh-1/accept", {
      method: "POST",
      headers: { ...TENANT_HEADERS, "Content-Type": "application/json" }
    });
    expect(res.status).toBe(409);
  });

  it("POST /crm/quote-handoffs/:id/reject — 200 transitions pending -> rejected", async () => {
    const handoff = makeHandoff();
    const { db } = makeFakeDb([handoff]);
    const app = buildApp({ db, resolveTenant: (req) => headerTenantResolver(req) });

    const res = await app.request("/crm/quote-handoffs/qh-1/reject", {
      method: "POST",
      headers: { ...TENANT_HEADERS, "Content-Type": "application/json" }
    });
    expect(res.status).toBe(200);
    const body = await res.json() as QuoteHandoff;
    expect(body.status).toBe("rejected");
  });

  it("POST /crm/quote-handoffs/:id/reject — 409 when already accepted", async () => {
    const handoff = makeHandoff({ status: "accepted", acceptedAt: "2026-05-28T10:00:00.000Z" });
    const { db } = makeFakeDb([handoff]);
    const app = buildApp({ db, resolveTenant: (req) => headerTenantResolver(req) });

    const res = await app.request("/crm/quote-handoffs/qh-1/reject", {
      method: "POST",
      headers: { ...TENANT_HEADERS, "Content-Type": "application/json" }
    });
    expect(res.status).toBe(409);
  });

  it("GET /crm/quote-handoffs — 401 without tenant headers", async () => {
    const { db } = makeFakeDb([]);
    const app = buildApp({ db, resolveTenant: (req) => headerTenantResolver(req) });

    const res = await app.request("/crm/quote-handoffs");
    expect(res.status).toBe(401);
  });

  it("POST /billing/invoices/from-quote-handoff — 201 creates invoice from pending handoff", async () => {
    const handoff = makeHandoff();
    const opp = makeOpportunity();
    const { db } = makeFakeDb([handoff], [opp]);
    const app = buildApp({ db, resolveTenant: (req) => headerTenantResolver(req) });

    const res = await app.request("/billing/invoices/from-quote-handoff", {
      method: "POST",
      headers: { ...TENANT_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ quoteHandoffId: "qh-1" })
    });
    expect(res.status).toBe(201);
    const body = await res.json() as { status: string; lines: unknown[]; total: { amountMinor: number } };
    expect(body.status).toBe("draft");
    expect(body.lines).toHaveLength(1);
    expect(body.total.amountMinor).toBe(500000);
  });

  it("POST /billing/invoices/from-quote-handoff — 404 for unknown handoff", async () => {
    const { db } = makeFakeDb([]);
    const app = buildApp({ db, resolveTenant: (req) => headerTenantResolver(req) });

    const res = await app.request("/billing/invoices/from-quote-handoff", {
      method: "POST",
      headers: { ...TENANT_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ quoteHandoffId: "no-such" })
    });
    expect(res.status).toBe(404);
  });

  it("POST /billing/invoices/from-quote-handoff — 409 for rejected handoff", async () => {
    const handoff = makeHandoff({ status: "rejected" });
    const opp = makeOpportunity();
    const { db } = makeFakeDb([handoff], [opp]);
    const app = buildApp({ db, resolveTenant: (req) => headerTenantResolver(req) });

    const res = await app.request("/billing/invoices/from-quote-handoff", {
      method: "POST",
      headers: { ...TENANT_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ quoteHandoffId: "qh-1" })
    });
    expect(res.status).toBe(409);
  });

  it("POST /billing/invoices/from-quote-handoff — 400 when quoteHandoffId missing", async () => {
    const { db } = makeFakeDb([]);
    const app = buildApp({ db, resolveTenant: (req) => headerTenantResolver(req) });

    const res = await app.request("/billing/invoices/from-quote-handoff", {
      method: "POST",
      headers: { ...TENANT_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    expect(res.status).toBe(400);
  });

  it("POST /billing/invoices/from-quote-handoff — 401 without tenant headers", async () => {
    const { db } = makeFakeDb([]);
    const app = buildApp({ db, resolveTenant: (req) => headerTenantResolver(req) });

    const res = await app.request("/billing/invoices/from-quote-handoff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quoteHandoffId: "qh-1" })
    });
    expect(res.status).toBe(401);
  });
});
