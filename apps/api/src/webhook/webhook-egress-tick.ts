import type { Queryable, TenantContext } from "../db/client";
import type { WebhookEgressPort, WebhookEgressFailureKind } from "./webhook-egress-port";
import { attemptWebhookDelivery } from "./webhook-delivery-service";
import { classifyFailure, nextRetryDelayMs, MAX_ATTEMPTS } from "./webhook-retry-policy";

// ---------------------------------------------------------------------------
// No-op port used when no port is configured (safe default for dev/tests).
// ---------------------------------------------------------------------------

const noOpPort: WebhookEgressPort = {
  async send() {
    return {
      ok: false,
      kind: "NETWORK" as const,
      httpStatus: null,
      message: "no port configured",
      durationMs: 0,
    };
  },
};

// ---------------------------------------------------------------------------
// Result + deps interfaces
// ---------------------------------------------------------------------------

export interface RunDueWebhookDeliveriesResult {
  processed: number;
  succeeded: number;
  failed: number;
  /** Already-disabled endpoints / not-yet-due retries (filtered out by SQL). */
  skipped: number;
  asOf: Date;
}

export interface RunDueWebhookDeliveriesDeps {
  port?: WebhookEgressPort;
  timeoutMs?: number;
}

// ---------------------------------------------------------------------------
// runDueWebhookDeliveries
// ---------------------------------------------------------------------------

/**
 * Poll for webhook deliveries that are due and attempt each one.
 *
 * Picks up rows where:
 *   - status = 'pending_egress', OR
 *   - status = 'failed' AND next_retry_at <= asOf AND attempt_count < MAX_ATTEMPTS
 *
 * Processes up to 100 rows per call (SKIP LOCKED — safe for concurrent workers).
 * After each attempt, schedules a retry via next_retry_at if the failure is retryable
 * and attempt_count has not reached the maximum.
 */
export async function runDueWebhookDeliveries(
  db: Queryable,
  ctx: TenantContext,
  asOf?: Date,
  deps?: RunDueWebhookDeliveriesDeps
): Promise<RunDueWebhookDeliveriesResult> {
  const effectiveAsOf = asOf ?? new Date();
  const port = deps?.port ?? noOpPort;
  const timeoutMs = deps?.timeoutMs ?? 10_000;

  // Query for due deliveries using SKIP LOCKED for safe concurrent execution.
  const { rows } = await db.query<{ id: string }>(
    `SELECT id
       FROM webhook_deliveries
      WHERE organization_id = $1
        AND (
              (status = 'pending_egress')
           OR (status = 'failed'
               AND next_retry_at IS NOT NULL
               AND next_retry_at <= $2
               AND attempt_count < $3)
            )
      ORDER BY signed_at ASC
      LIMIT 100
        FOR UPDATE SKIP LOCKED`,
    [ctx.organizationId, effectiveAsOf, MAX_ATTEMPTS]
  );

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  for (const row of rows) {
    processed++;

    const result = await attemptWebhookDelivery(db, ctx, row.id, { port, timeoutMs });

    if (result.outcome === "succeeded") {
      succeeded++;
    } else {
      failed++;

      // Schedule retry if failure is retryable and we have remaining attempts.
      // We need the current attempt_count to compute the next delay index.
      // attemptWebhookDelivery increments attempt_count via markDeliveryAttempt,
      // so we read the updated row to get the post-increment count.
      const { rows: updatedRows } = await db.query<{ attempt_count: number }>(
        `SELECT attempt_count FROM webhook_deliveries WHERE id = $1 AND organization_id = $2`,
        [row.id, ctx.organizationId]
      );
      const attemptCount = updatedRows[0]?.attempt_count ?? 1;

      const disposition = classifyFailure({
        kind: (result.errorDetail ?? null) as WebhookEgressFailureKind | null,
        httpStatus: result.httpStatus,
      });

      if (disposition === "retryable" && attemptCount < MAX_ATTEMPTS) {
        const delayMs = nextRetryDelayMs(attemptCount);
        if (delayMs !== null) {
          const nextRetryAt = new Date(effectiveAsOf.getTime() + delayMs);
          await db.query(
            `UPDATE webhook_deliveries
                SET next_retry_at = $1
              WHERE id = $2
                AND organization_id = $3`,
            [nextRetryAt, row.id, ctx.organizationId]
          );
        }
      }
    }
  }

  return {
    processed,
    succeeded,
    failed,
    skipped: 0,
    asOf: effectiveAsOf,
  };
}
