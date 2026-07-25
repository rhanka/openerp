import type { IdempotencyRecord } from "@sentropic/openerp-domain";
import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";

// Repository for IdempotencyRecord (PG-08).
// Middleware wiring (route-level interception, header reading, body hashing) lives in
// apps/api/src/http/idempotency-middleware.ts. This file only owns the SQL surface.

const IDEMPOTENCY_COLUMNS = `
  organization_id as "organizationId",
  key,
  request_hash as "requestHash",
  response_body_hash as "responseBodyHash",
  status_code as "statusCode",
  to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt",
  to_char(expires_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "expiresAt"
`;

const IDEMPOTENCY_RAW_COLUMNS = `
  organization_id,
  key,
  request_hash,
  response_body_hash,
  status_code,
  created_at,
  expires_at
`;

export interface RegisterIdempotencyInput {
  key: string;
  requestHash: string;
  responseBodyHash: string;
  statusCode: number;
  ttlSeconds: number;
  now: string;
}

/** Atomic try-insert. If the key already exists and is not expired, returns the existing record. */
export async function registerOrReplayIdempotencyRecord(
  db: Queryable,
  context: TenantContext,
  input: RegisterIdempotencyInput
): Promise<{ replay: boolean; record: IdempotencyRecord }> {
  assertTenantContext(context);
  if (input.ttlSeconds <= 0) {
    throw new Error("Idempotency ttlSeconds must be positive");
  }
  const expiresAt = new Date(new Date(input.now).getTime() + input.ttlSeconds * 1000).toISOString();
  const result = await db.query<IdempotencyRecord & { replay: boolean }>(
    `with attempt as (
       insert into idempotency_records (
         organization_id, key, request_hash, response_body_hash, status_code, created_at, expires_at
       ) values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (organization_id, key) do nothing
       returning ${IDEMPOTENCY_RAW_COLUMNS}
     )
     select false as replay, ${IDEMPOTENCY_COLUMNS} from attempt
     union all
     select true as replay, ${IDEMPOTENCY_COLUMNS}
       from idempotency_records
      where organization_id = $1 and key = $2
        and not exists (select 1 from attempt)`,
    [
      context.organizationId,
      input.key,
      input.requestHash,
      input.responseBodyHash,
      input.statusCode,
      input.now,
      expiresAt
    ]
  );
  const row = result.rows[0];
  if (!row) {
    throw new Error("registerOrReplayIdempotencyRecord returned no row (race condition?)");
  }
  const { replay, ...record } = row;
  return { replay, record };
}

export interface FinaliseIdempotencyInput {
  key: string;
  responseBodyHash: string;
  statusCode: number;
}

/** After the handler runs, persist the actual response hash + status code. */
export async function finaliseIdempotencyRecord(
  db: Queryable,
  context: TenantContext,
  input: FinaliseIdempotencyInput
): Promise<IdempotencyRecord | null> {
  assertTenantContext(context);
  const result = await db.query<IdempotencyRecord>(
    `update idempotency_records
        set response_body_hash = $3, status_code = $4
      where organization_id = $1 and key = $2
      returning ${IDEMPOTENCY_COLUMNS}`,
    [context.organizationId, input.key, input.responseBodyHash, input.statusCode]
  );
  return result.rows[0] ?? null;
}

export async function findIdempotencyRecord(
  db: Queryable,
  context: TenantContext,
  key: string
): Promise<IdempotencyRecord | null> {
  assertTenantContext(context);
  const result = await db.query<IdempotencyRecord>(
    `select ${IDEMPOTENCY_COLUMNS}
       from idempotency_records
      where organization_id = $1 and key = $2`,
    [context.organizationId, key]
  );
  return result.rows[0] ?? null;
}

export async function purgeExpiredIdempotencyRecords(
  db: Queryable,
  asOf: string
): Promise<number> {
  const result = await db.query<{ key: string }>(
    `delete from idempotency_records
       where expires_at <= $1
       returning key`,
    [asOf]
  );
  return result.rows.length;
}

/** Compute a deterministic stable string for a request body. Implementations should hash this. */
export function canonicalRequestPayload(method: string, path: string, body: unknown): string {
  return JSON.stringify({ method: method.toUpperCase(), path, body }, sortKeys);
}

function sortKeys(_key: string, value: unknown): unknown {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return value;
  const obj = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const k of Object.keys(obj).sort()) {
    sorted[k] = obj[k];
  }
  return sorted;
}
