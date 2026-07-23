import type { Context, Hono } from "hono";

import type { AppBindings } from "../app";
import type { Queryable } from "../../db/client";
import {
  BankingConflictError,
  BankingNotFoundError,
  BankingValidationError,
  confirmReconciliationProposal,
  ignoreBankTransaction,
  importBankingSnapshot,
  listBankTransactions,
  listStoredProposals,
  refreshReconciliationProposals,
  rejectReconciliationProposal,
  unmatchReconciliationProposal,
  withBankingReadScope,
  type QueryablePool
} from "../../reconciliation/banking-persistence";

const TRANSACTION_STATUSES = new Set(["unmatched", "matched", "ignored"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function transactionPool(db: Queryable): QueryablePool {
  if (!("withClient" in db) || typeof db.withClient !== "function") {
    // No test/in-memory fallback: banking mutations must use a real transaction-capable pool.
    throw new Error("Banking persistence requires a QueryablePool with withClient()");
  }
  return db as QueryablePool;
}

function parseInteger(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (!/^(?:0|[1-9]\d*)$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function parseUuid(value: string, field: string): string {
  if (!UUID_PATTERN.test(value)) {
    throw new BankingValidationError(`${field} must be a UUID`);
  }
  return value;
}

function errorResponse(c: Context<AppBindings>, error: unknown) {
  if (error instanceof BankingValidationError) {
    return c.json({ code: "INVALID_INPUT", message: error.message }, 400);
  }
  if (error instanceof BankingNotFoundError) {
    return c.json({ code: "NOT_FOUND", message: error.message }, 404);
  }
  if (error instanceof BankingConflictError) {
    return c.json({ code: "CONFLICT", message: error.message }, 409);
  }
  throw error;
}

export function mountBankingRoutes(app: Hono<AppBindings>): void {
  app.post("/banking/import", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ code: "INVALID_JSON" }, 400);
    }
    try {
      const result = await importBankingSnapshot(transactionPool(c.get("db")), c.get("tenant"), body);
      return c.json(result, 200);
    } catch (error) {
      return errorResponse(c, error);
    }
  });

  app.get("/banking/transactions", async (c) => {
    const status = c.req.query("status");
    if (status !== undefined && !TRANSACTION_STATUSES.has(status)) {
      return c.json({ code: "INVALID_INPUT", message: "status must be unmatched, matched, or ignored" }, 400);
    }
    const rawLimit = c.req.query("limit");
    const rawOffset = c.req.query("offset");
    const limit = parseInteger(rawLimit);
    const offset = parseInteger(rawOffset);
    if (rawLimit !== undefined && (limit === undefined || limit < 1 || limit > 200)) {
      return c.json({ code: "INVALID_INPUT", message: "limit must be an integer between 1 and 200" }, 400);
    }
    if (rawOffset !== undefined && offset === undefined) {
      return c.json({ code: "INVALID_INPUT", message: "offset must be a non-negative integer" }, 400);
    }
    const pool = transactionPool(c.get("db"));
    const tenant = c.get("tenant");
    const items = await withBankingReadScope(pool, tenant, (client) => listBankTransactions(client, tenant, {
      ...(status !== undefined ? { status: status as "unmatched" | "matched" | "ignored" } : {}),
      ...(limit !== undefined ? { limit } : {}),
      ...(offset !== undefined ? { offset } : {})
    }));
    return c.json({ items });
  });

  app.get("/banking/reconciliation/suggestions", async (c) => {
    // Intentionally read-only: persisted proposals are only created by POST /refresh.
    const pool = transactionPool(c.get("db"));
    const tenant = c.get("tenant");
    const items = await withBankingReadScope(pool, tenant, (client) => listStoredProposals(client, tenant));
    return c.json({ items });
  });

  app.post("/banking/reconciliation/refresh", async (c) => {
    try {
      const result = await refreshReconciliationProposals(transactionPool(c.get("db")), c.get("tenant"));
      return c.json(result, 200);
    } catch (error) {
      return errorResponse(c, error);
    }
  });

  app.post("/banking/reconciliation/:linkId/confirm", async (c) => {
    try {
      return c.json(
        await confirmReconciliationProposal(
          transactionPool(c.get("db")),
          c.get("tenant"),
          parseUuid(c.req.param("linkId"), "linkId")
        ),
        200
      );
    } catch (error) {
      return errorResponse(c, error);
    }
  });

  app.post("/banking/reconciliation/:linkId/reject", async (c) => {
    try {
      return c.json(
        await rejectReconciliationProposal(
          transactionPool(c.get("db")),
          c.get("tenant"),
          parseUuid(c.req.param("linkId"), "linkId")
        ),
        200
      );
    } catch (error) {
      return errorResponse(c, error);
    }
  });

  app.post("/banking/reconciliation/:linkId/unmatch", async (c) => {
    try {
      return c.json(
        await unmatchReconciliationProposal(
          transactionPool(c.get("db")),
          c.get("tenant"),
          parseUuid(c.req.param("linkId"), "linkId")
        ),
        200
      );
    } catch (error) {
      return errorResponse(c, error);
    }
  });

  app.post("/banking/transactions/:id/ignore", async (c) => {
    try {
      return c.json(
        await ignoreBankTransaction(transactionPool(c.get("db")), c.get("tenant"), parseUuid(c.req.param("id"), "id")),
        200
      );
    } catch (error) {
      return errorResponse(c, error);
    }
  });
}
