import type { FxRateSnapshot } from "@sentropic/openerp-domain";
import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";

// Repository for FxRateSnapshot (PG-06 article 1). Tenant-scoped.
// rate is stored numeric(20,10) in Postgres and surfaced as a string in TS for
// precision. Multiplication happens in currency-resolver.ts.

const FX_COLUMNS = `
  id,
  organization_id as "organizationId",
  source_currency as "sourceCurrency",
  target_currency as "targetCurrency",
  rate::text as rate,
  effective_at as "effectiveAt",
  source
`;

function assertCurrency(code: string, label: string): void {
  if (code.length !== 3 || code.toUpperCase() !== code) {
    throw new Error(`${label} must be ISO 4217 uppercase (3 chars), got '${code}'`);
  }
}

export interface InsertFxRateInput {
  sourceCurrency: string;
  targetCurrency: string;
  rate: string;
  effectiveAt: string;
  source: string;
}

export async function insertFxRateSnapshot(
  db: Queryable,
  context: TenantContext,
  input: InsertFxRateInput
): Promise<FxRateSnapshot> {
  assertTenantContext(context);
  assertCurrency(input.sourceCurrency, "sourceCurrency");
  assertCurrency(input.targetCurrency, "targetCurrency");
  const parsed = Number(input.rate);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`rate must be a positive number, got '${input.rate}'`);
  }
  const result = await db.query<FxRateSnapshot>(
    `insert into fx_rate_snapshots (
       organization_id, source_currency, target_currency, rate, effective_at, source
     ) values ($1, $2, $3, $4, $5, $6)
     returning ${FX_COLUMNS}`,
    [
      context.organizationId,
      input.sourceCurrency,
      input.targetCurrency,
      input.rate,
      input.effectiveAt,
      input.source
    ]
  );
  return result.rows[0]!;
}

export async function findFxRateAt(
  db: Queryable,
  context: TenantContext,
  params: { sourceCurrency: string; targetCurrency: string; effectiveAt: string }
): Promise<FxRateSnapshot | null> {
  assertTenantContext(context);
  assertCurrency(params.sourceCurrency, "sourceCurrency");
  assertCurrency(params.targetCurrency, "targetCurrency");
  const result = await db.query<FxRateSnapshot>(
    `select ${FX_COLUMNS}
       from fx_rate_snapshots
      where organization_id = $1
        and source_currency = $2
        and target_currency = $3
        and effective_at <= $4
      order by effective_at desc
      limit 1`,
    [context.organizationId, params.sourceCurrency, params.targetCurrency, params.effectiveAt]
  );
  return result.rows[0] ?? null;
}

export interface ListFxRatesOptions {
  sourceCurrency?: string;
  targetCurrency?: string;
  effectiveAfter?: string;
  effectiveBefore?: string;
  limit?: number;
}

export async function listFxRatesForOrganization(
  db: Queryable,
  context: TenantContext,
  opts: ListFxRatesOptions = {}
): Promise<FxRateSnapshot[]> {
  assertTenantContext(context);
  const filters: string[] = ["organization_id = $1"];
  const values: unknown[] = [context.organizationId];
  let i = 2;
  if (opts.sourceCurrency) {
    assertCurrency(opts.sourceCurrency, "sourceCurrency");
    filters.push(`source_currency = $${i++}`);
    values.push(opts.sourceCurrency);
  }
  if (opts.targetCurrency) {
    assertCurrency(opts.targetCurrency, "targetCurrency");
    filters.push(`target_currency = $${i++}`);
    values.push(opts.targetCurrency);
  }
  if (opts.effectiveAfter) {
    filters.push(`effective_at >= $${i++}`);
    values.push(opts.effectiveAfter);
  }
  if (opts.effectiveBefore) {
    filters.push(`effective_at <= $${i++}`);
    values.push(opts.effectiveBefore);
  }
  const limit = opts.limit ?? 100;
  const result = await db.query<FxRateSnapshot>(
    `select ${FX_COLUMNS}
       from fx_rate_snapshots
      where ${filters.join(" and ")}
      order by effective_at desc
      limit $${i}`,
    [...values, limit]
  );
  return result.rows;
}
