import { createHash } from "node:crypto";
import type { IdempotencyRecord } from "@openerp/domain";
import type { Queryable, TenantContext } from "../db/client";
import {
  canonicalRequestPayload,
  finaliseIdempotencyRecord,
  registerOrReplayIdempotencyRecord
} from "../foundation/idempotency";

// withIdempotency — pure wrapper around a handler that enforces PG-08.
// The HTTP server framework is not yet wired (routes are still declarative
// RouteContract metadata in apps/api/src/http/routes/foundation.ts). This
// function is the unit of behaviour the future framework will call once per
// idempotency-marked request.

export const IDEMPOTENCY_TTL_SECONDS = 86_400; // 24h, Stripe-compatible default.

export interface IdempotencyRequest {
  method: string;
  path: string;
  body: unknown;
  headers: Record<string, string | undefined>;
}

export interface IdempotencyHandlerResult {
  statusCode: number;
  body: unknown;
}

export type IdempotencyHandler = () => Promise<IdempotencyHandlerResult>;

export interface IdempotencyOutcome {
  statusCode: number;
  body: unknown;
  replayed: boolean;
  record: IdempotencyRecord;
}

export class IdempotencyKeyRequiredError extends Error {
  readonly code = "IDEMPOTENCY_KEY_REQUIRED";
  constructor() {
    super("Idempotency-Key header is required for this request");
  }
}

export async function withIdempotency(
  db: Queryable,
  context: TenantContext,
  request: IdempotencyRequest,
  handler: IdempotencyHandler,
  now: () => string = () => new Date().toISOString()
): Promise<IdempotencyOutcome> {
  const key = readIdempotencyKey(request.headers);
  if (!key) throw new IdempotencyKeyRequiredError();

  const requestHash = sha256(canonicalRequestPayload(request.method, request.path, request.body));

  const startedAt = now();
  const placeholderHash = "";
  const placeholderStatus = 0;
  const { replay, record } = await registerOrReplayIdempotencyRecord(db, context, {
    key,
    requestHash,
    responseBodyHash: placeholderHash,
    statusCode: placeholderStatus,
    ttlSeconds: IDEMPOTENCY_TTL_SECONDS,
    now: startedAt
  });

  if (replay) {
    return {
      statusCode: record.statusCode,
      body: replayBody(record, requestHash),
      replayed: true,
      record
    };
  }

  let result: IdempotencyHandlerResult;
  try {
    result = await handler();
  } catch (err) {
    await finaliseIdempotencyRecord(db, context, {
      key,
      responseBodyHash: "",
      statusCode: 500
    });
    throw err;
  }

  const responseBodyHash = sha256(stableStringify(result.body));
  const finalRecord = await finaliseIdempotencyRecord(db, context, {
    key,
    responseBodyHash,
    statusCode: result.statusCode
  });
  return {
    statusCode: result.statusCode,
    body: result.body,
    replayed: false,
    record: finalRecord ?? record
  };
}

function readIdempotencyKey(headers: Record<string, string | undefined>): string | null {
  // HTTP headers are case-insensitive; accept any casing.
  for (const [name, value] of Object.entries(headers)) {
    if (name.toLowerCase() === "idempotency-key" && typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function sha256(input: string): string {
  return "sha256:" + createHash("sha256").update(input).digest("hex");
}

function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_, v) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(v as Record<string, unknown>).sort()) {
        sorted[k] = (v as Record<string, unknown>)[k];
      }
      return sorted;
    }
    return v;
  });
}

/** When replaying we only have the stored hash, not the original body. Return a
 *  small envelope so callers can recognise replays explicitly. */
function replayBody(record: IdempotencyRecord, currentRequestHash: string) {
  return {
    replayed: true,
    key: record.key,
    originalStatusCode: record.statusCode,
    responseBodyHash: record.responseBodyHash,
    requestHashMatch: record.requestHash === currentRequestHash
  };
}
