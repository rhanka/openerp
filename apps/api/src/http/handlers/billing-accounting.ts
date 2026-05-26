import type { Hono } from "hono";

import type { AppBindings } from "../app";
import type { AccountType, CreateAccountInput, JournalEntryStatus } from "@sentropic/openerp-domain/billing";
import {
  AccountNotFoundError,
  JournalEntryNotFoundError,
  JournalEntryTransitionError,
  JournalPostingError,
  UnbalancedJournalEntryError,
  createAccount,
  createJournalEntry,
  deleteAccount,
  deleteJournalEntryService,
  getAccountById,
  getJournalEntryById,
  listAccounts,
  listJournalEntries,
  postInvoiceToJournal,
  postJournalEntry,
  postPaymentToJournal,
  updateAccountService,
  voidJournalEntry
} from "../../billing/accounting-service";

const VALID_ACCOUNT_TYPES: AccountType[] = ["asset", "liability", "equity", "revenue", "expense"];
const VALID_JOURNAL_STATUSES: JournalEntryStatus[] = ["draft", "posted", "void"];

function parseIntOrUndefined(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && Number.isInteger(n) ? n : undefined;
}

export function mountBillingAccountingRoutes(app: Hono<AppBindings>): void {
  // ---------------------------------------------------------------------------
  // Accounts
  // ---------------------------------------------------------------------------

  app.get("/billing/accounts", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const type = c.req.query("type") as AccountType | undefined;
    const activeStr = c.req.query("active");
    const active = activeStr === "true" ? true : activeStr === "false" ? false : undefined;
    const limit = parseIntOrUndefined(c.req.query("limit"));
    const offset = parseIntOrUndefined(c.req.query("offset"));
    const items = await listAccounts(db, tenant, {
      ...(type !== undefined && VALID_ACCOUNT_TYPES.includes(type) ? { type } : {}),
      ...(active !== undefined ? { active } : {}),
      ...(limit !== undefined ? { limit } : {}),
      ...(offset !== undefined ? { offset } : {})
    });
    return c.json({ items });
  });

  app.post("/billing/accounts", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    let body: { code?: unknown; name?: unknown; type?: unknown; active?: unknown };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ code: "INVALID_JSON" }, 400);
    }
    if (!body?.code || typeof body.code !== "string" || body.code.trim() === "") {
      return c.json({ code: "INVALID_INPUT", errors: { code: "REQUIRED" } }, 400);
    }
    if (!body?.name || typeof body.name !== "string" || body.name.trim() === "") {
      return c.json({ code: "INVALID_INPUT", errors: { name: "REQUIRED" } }, 400);
    }
    if (!body?.type || !VALID_ACCOUNT_TYPES.includes(body.type as AccountType)) {
      return c.json({ code: "INVALID_INPUT", errors: { type: "REQUIRED_VALID_TYPE" } }, 400);
    }
    try {
      const input: CreateAccountInput = {
        code: body.code as string,
        name: body.name as string,
        type: body.type as AccountType
      };
      if (body.active !== undefined) input.active = Boolean(body.active);
      const result = await createAccount(db, tenant, input);
      return c.json(result, 201);
    } catch (err) {
      throw err;
    }
  });

  app.get("/billing/accounts/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const found = await getAccountById(db, tenant, c.req.param("id"));
    if (!found) return c.json({ code: "NOT_FOUND" }, 404);
    return c.json(found);
  });

  app.patch("/billing/accounts/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    let body: { name?: unknown; type?: unknown; active?: unknown };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ code: "INVALID_JSON" }, 400);
    }
    try {
      const result = await updateAccountService(db, tenant, id, {
        ...(body.name !== undefined ? { name: String(body.name) } : {}),
        ...(body.type !== undefined && VALID_ACCOUNT_TYPES.includes(body.type as AccountType)
          ? { type: body.type as AccountType }
          : {}),
        ...(body.active !== undefined ? { active: Boolean(body.active) } : {})
      });
      return c.json(result);
    } catch (err) {
      if (err instanceof AccountNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      throw err;
    }
  });

  app.delete("/billing/accounts/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    try {
      await deleteAccount(db, tenant, id);
      return c.body(null, 204);
    } catch (err) {
      if (err instanceof AccountNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      throw err;
    }
  });

  // ---------------------------------------------------------------------------
  // Journal Entries
  // ---------------------------------------------------------------------------

  app.get("/billing/journal-entries", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const sourceType = c.req.query("sourceType");
    const sourceId = c.req.query("sourceId");
    const status = c.req.query("status");
    const limit = parseIntOrUndefined(c.req.query("limit"));
    const offset = parseIntOrUndefined(c.req.query("offset"));
    const items = await listJournalEntries(db, tenant, {
      ...(sourceType !== undefined ? { sourceType } : {}),
      ...(sourceId !== undefined ? { sourceId } : {}),
      ...(status !== undefined && VALID_JOURNAL_STATUSES.includes(status as JournalEntryStatus)
        ? { status }
        : {}),
      ...(limit !== undefined ? { limit } : {}),
      ...(offset !== undefined ? { offset } : {})
    });
    return c.json({ items });
  });

  app.get("/billing/journal-entries/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const found = await getJournalEntryById(db, tenant, c.req.param("id"));
    if (!found) return c.json({ code: "NOT_FOUND" }, 404);
    return c.json(found);
  });

  app.post("/billing/journal-entries", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    let body: {
      entryDate?: unknown;
      reference?: unknown;
      description?: unknown;
      sourceType?: unknown;
      sourceId?: unknown;
      lines?: unknown;
    };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ code: "INVALID_JSON" }, 400);
    }
    if (!body?.entryDate || typeof body.entryDate !== "string") {
      return c.json({ code: "INVALID_INPUT", errors: { entryDate: "REQUIRED" } }, 400);
    }
    if (!Array.isArray(body.lines) || body.lines.length === 0) {
      return c.json({ code: "INVALID_INPUT", errors: { lines: "REQUIRED" } }, 400);
    }
    try {
      const result = await createJournalEntry(db, tenant, {
        entryDate: body.entryDate as string,
        reference: body.reference != null ? String(body.reference) : null,
        description: body.description != null ? String(body.description) : null,
        sourceType: "manual",
        sourceId: body.sourceId != null ? String(body.sourceId) : null,
        lines: (body.lines as Array<Record<string, unknown>>).map((l) => ({
          accountId: String(l.accountId),
          debit: l.debit as { amountMinor: number; currency: string; scale: number },
          credit: l.credit as { amountMinor: number; currency: string; scale: number },
          description: l.description != null ? String(l.description) : null
        }))
      });
      return c.json(result, 201);
    } catch (err) {
      if (err instanceof UnbalancedJournalEntryError) {
        return c.json({ code: "UNBALANCED_JOURNAL_ENTRY", message: err.message }, 422);
      }
      throw err;
    }
  });

  app.post("/billing/journal-entries/:id/post", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    try {
      const result = await postJournalEntry(db, tenant, id);
      return c.json(result);
    } catch (err) {
      if (err instanceof JournalEntryNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      if (err instanceof JournalEntryTransitionError) {
        return c.json({ code: "ILLEGAL_TRANSITION", message: err.message }, 409);
      }
      throw err;
    }
  });

  app.post("/billing/journal-entries/:id/void", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    try {
      const result = await voidJournalEntry(db, tenant, id);
      return c.json(result);
    } catch (err) {
      if (err instanceof JournalEntryNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      if (err instanceof JournalEntryTransitionError) {
        return c.json({ code: "ILLEGAL_TRANSITION", message: err.message }, 409);
      }
      throw err;
    }
  });

  app.delete("/billing/journal-entries/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    try {
      await deleteJournalEntryService(db, tenant, id);
      return c.body(null, 204);
    } catch (err) {
      if (err instanceof JournalEntryNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      if (err instanceof JournalEntryTransitionError) {
        return c.json({ code: "ILLEGAL_TRANSITION", message: err.message }, 409);
      }
      throw err;
    }
  });

  // ---------------------------------------------------------------------------
  // Post-to-journal from Invoice / Payment
  // ---------------------------------------------------------------------------

  app.post("/billing/invoices/:id/post-to-journal", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    try {
      const result = await postInvoiceToJournal(db, tenant, id);
      return c.json(result, 201);
    } catch (err) {
      if (err instanceof JournalPostingError) {
        return c.json({ code: "JOURNAL_POSTING_ERROR", message: err.message }, 422);
      }
      throw err;
    }
  });

  app.post("/billing/payments/:id/post-to-journal", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    try {
      const result = await postPaymentToJournal(db, tenant, id);
      return c.json(result, 201);
    } catch (err) {
      if (err instanceof JournalPostingError) {
        return c.json({ code: "JOURNAL_POSTING_ERROR", message: err.message }, 422);
      }
      throw err;
    }
  });
}
