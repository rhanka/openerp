import type {
  WebhookEndpoint,
  WebhookDelivery
} from "@sentropic/openerp-domain/webhook";
import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";

// Repository for WebhookEndpoint and WebhookDelivery entities.
// IMPORTANT: signing_secret is NEVER selected outside findByIdWithSecret.

// ---------------------------------------------------------------------------
// Column projection helpers
// ---------------------------------------------------------------------------

// Public columns — signing_secret is intentionally omitted.
const ENDPOINT_PUBLIC_COLUMNS = `
  id,
  organization_id as "organizationId",
  owner_user_id as "ownerUserId",
  name,
  target_url as "targetUrl",
  event_types as "eventTypes",
  is_active as "isActive",
  is_shared as "isShared",
  consecutive_failures as "consecutiveFailures",
  to_char(disabled_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "disabledAt",
  to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt",
  to_char(updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "updatedAt"
`;

const DELIVERY_COLUMNS = `
  id,
  organization_id as "organizationId",
  webhook_endpoint_id as "webhookEndpointId",
  event_type as "eventType",
  trigger_audit_event_id as "triggerAuditEventId",
  payload,
  signature,
  status,
  http_status as "httpStatus",
  attempt_count as "attemptCount",
  to_char(next_retry_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "nextRetryAt",
  error_detail as "errorDetail",
  to_char(signed_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "signedAt",
  to_char(delivered_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "deliveredAt",
  to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt"
`;

// ---------------------------------------------------------------------------
// WebhookEndpoint repository
// ---------------------------------------------------------------------------

export async function insertWebhookEndpoint(
  db: Queryable,
  context: TenantContext,
  input: {
    ownerUserId: string | null;
    name: string;
    targetUrl: string;
    signingSecret: string;
    eventTypes: string[];
    isActive: boolean;
    isShared: boolean;
  }
): Promise<WebhookEndpoint> {
  assertTenantContext(context);
  const result = await db.query<WebhookEndpoint>(
    `insert into webhook_endpoints (
       organization_id, owner_user_id, name, target_url, signing_secret,
       event_types, is_active, is_shared
     ) values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
     returning ${ENDPOINT_PUBLIC_COLUMNS}`,
    [
      context.organizationId,
      input.ownerUserId ?? null,
      input.name,
      input.targetUrl,
      input.signingSecret,
      JSON.stringify(input.eventTypes),
      input.isActive,
      input.isShared
    ]
  );
  return result.rows[0]!;
}

export async function findWebhookEndpointById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<WebhookEndpoint | null> {
  assertTenantContext(context);
  const result = await db.query<WebhookEndpoint>(
    `select ${ENDPOINT_PUBLIC_COLUMNS}
       from webhook_endpoints
      where id = $1 and organization_id = $2 and deleted_at is null`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}

/** The ONLY function that selects signing_secret. Used exclusively by the evaluator. */
export async function findWebhookEndpointByIdWithSecret(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<(WebhookEndpoint & { signingSecret: string }) | null> {
  assertTenantContext(context);
  const result = await db.query<WebhookEndpoint & { signingSecret: string }>(
    `select ${ENDPOINT_PUBLIC_COLUMNS},
            signing_secret as "signingSecret"
       from webhook_endpoints
      where id = $1 and organization_id = $2 and deleted_at is null`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}

export async function listWebhookEndpoints(
  db: Queryable,
  context: TenantContext,
  options: {
    ownerUserId?: string | null;
    isShared?: boolean;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  } = {}
): Promise<WebhookEndpoint[]> {
  assertTenantContext(context);
  const conditions: string[] = ["organization_id = $1", "deleted_at is null"];
  const params: unknown[] = [context.organizationId];

  if (options.ownerUserId !== undefined) {
    if (options.ownerUserId === null) {
      conditions.push(`owner_user_id is null`);
    } else {
      params.push(options.ownerUserId);
      conditions.push(`owner_user_id = $${params.length}`);
    }
  }
  if (options.isShared !== undefined) {
    params.push(options.isShared);
    conditions.push(`is_shared = $${params.length}`);
  }
  if (options.isActive !== undefined) {
    params.push(options.isActive);
    conditions.push(`is_active = $${params.length}`);
  }

  params.push(options.limit ?? 100);
  const limitClause = `limit $${params.length}`;
  params.push(options.offset ?? 0);
  const offsetClause = `offset $${params.length}`;

  const result = await db.query<WebhookEndpoint>(
    `select ${ENDPOINT_PUBLIC_COLUMNS}
       from webhook_endpoints
      where ${conditions.join(" and ")}
      order by created_at desc
      ${limitClause} ${offsetClause}`,
    params
  );
  return result.rows;
}

/** Used by the evaluator to find endpoints that subscribe to a given event type. */
export async function listActiveEndpointsBySubscribedEvent(
  db: Queryable,
  context: TenantContext,
  eventType: string
): Promise<WebhookEndpoint[]> {
  assertTenantContext(context);
  const result = await db.query<WebhookEndpoint>(
    `select ${ENDPOINT_PUBLIC_COLUMNS}
       from webhook_endpoints
      where organization_id = $1
        and deleted_at is null
        and is_active = true
        and event_types @> $2::jsonb`,
    [context.organizationId, JSON.stringify([eventType])]
  );
  return result.rows;
}

export async function updateWebhookEndpointRepo(
  db: Queryable,
  context: TenantContext,
  id: string,
  patch: {
    name?: string;
    targetUrl?: string;
    eventTypes?: string[];
    isActive?: boolean;
    isShared?: boolean;
  }
): Promise<WebhookEndpoint | null> {
  assertTenantContext(context);
  const sets: string[] = ["updated_at = now()"];
  const params: unknown[] = [id, context.organizationId];

  if (patch.name !== undefined) {
    params.push(patch.name);
    sets.push(`name = $${params.length}`);
  }
  if (patch.targetUrl !== undefined) {
    params.push(patch.targetUrl);
    sets.push(`target_url = $${params.length}`);
  }
  if (patch.eventTypes !== undefined) {
    params.push(JSON.stringify(patch.eventTypes));
    sets.push(`event_types = $${params.length}::jsonb`);
  }
  if (patch.isActive !== undefined) {
    params.push(patch.isActive);
    sets.push(`is_active = $${params.length}`);
  }
  if (patch.isShared !== undefined) {
    params.push(patch.isShared);
    sets.push(`is_shared = $${params.length}`);
  }

  const result = await db.query<WebhookEndpoint>(
    `update webhook_endpoints
        set ${sets.join(", ")}
      where id = $1 and organization_id = $2 and deleted_at is null
      returning ${ENDPOINT_PUBLIC_COLUMNS}`,
    params
  );
  return result.rows[0] ?? null;
}

export async function softDeleteWebhookEndpoint(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<boolean> {
  assertTenantContext(context);
  const result = await db.query<{ id: string }>(
    `update webhook_endpoints
        set deleted_at = now(), updated_at = now()
      where id = $1 and organization_id = $2 and deleted_at is null
      returning id`,
    [id, context.organizationId]
  );
  return result.rows.length > 0;
}

export async function rotateWebhookEndpointSecret(
  db: Queryable,
  context: TenantContext,
  id: string,
  newSecret: string
): Promise<boolean> {
  assertTenantContext(context);
  const result = await db.query<{ id: string }>(
    `update webhook_endpoints
        set signing_secret = $3, updated_at = now()
      where id = $1 and organization_id = $2 and deleted_at is null
      returning id`,
    [id, context.organizationId, newSecret]
  );
  return result.rows.length > 0;
}

// ---------------------------------------------------------------------------
// WebhookDelivery repository
// ---------------------------------------------------------------------------

export async function insertWebhookDelivery(
  db: Queryable,
  context: TenantContext,
  input: {
    webhookEndpointId: string;
    eventType: string;
    triggerAuditEventId: string | null;
    payload: Record<string, unknown>;
    signature: string;
    signedAt: string;
  }
): Promise<WebhookDelivery> {
  assertTenantContext(context);
  const result = await db.query<WebhookDelivery>(
    `insert into webhook_deliveries (
       organization_id, webhook_endpoint_id, event_type, trigger_audit_event_id,
       payload, signature, signed_at
     ) values ($1, $2, $3, $4, $5::jsonb, $6, $7)
     on conflict (webhook_endpoint_id, trigger_audit_event_id)
       where trigger_audit_event_id is not null
     do nothing
     returning ${DELIVERY_COLUMNS}`,
    [
      context.organizationId,
      input.webhookEndpointId,
      input.eventType,
      input.triggerAuditEventId ?? null,
      JSON.stringify(input.payload),
      input.signature,
      input.signedAt
    ]
  );
  // If on conflict did nothing, fetch the existing row
  if (result.rows.length === 0 && input.triggerAuditEventId !== null) {
    const existing = await db.query<WebhookDelivery>(
      `select ${DELIVERY_COLUMNS}
         from webhook_deliveries
        where webhook_endpoint_id = $1
          and trigger_audit_event_id = $2`,
      [input.webhookEndpointId, input.triggerAuditEventId]
    );
    return existing.rows[0]!;
  }
  return result.rows[0]!;
}

export async function findWebhookDeliveryById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<WebhookDelivery | null> {
  assertTenantContext(context);
  const result = await db.query<WebhookDelivery>(
    `select ${DELIVERY_COLUMNS}
       from webhook_deliveries
      where id = $1 and organization_id = $2`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}

export async function listDeliveriesByEndpoint(
  db: Queryable,
  context: TenantContext,
  webhookEndpointId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<WebhookDelivery[]> {
  assertTenantContext(context);
  const result = await db.query<WebhookDelivery>(
    `select ${DELIVERY_COLUMNS}
       from webhook_deliveries
      where organization_id = $1
        and webhook_endpoint_id = $2
      order by created_at desc
      limit $3 offset $4`,
    [
      context.organizationId,
      webhookEndpointId,
      options.limit ?? 50,
      options.offset ?? 0
    ]
  );
  return result.rows;
}

// ---------------------------------------------------------------------------
// Delivery attempt mutation helpers (W0-delivery-attempt)
// ---------------------------------------------------------------------------

export async function markDeliveryAttempt(
  db: Queryable,
  context: TenantContext,
  input: {
    deliveryId: string;
    status: "succeeded" | "failed";
    httpStatus: number | null;
    errorDetail: string | null;
  }
): Promise<void> {
  assertTenantContext(context);
  await db.query(
    `update webhook_deliveries
        set status       = $1,
            http_status  = $2,
            attempt_count = attempt_count + 1,
            error_detail  = $3,
            delivered_at  = case when $1 = 'succeeded' then now() else delivered_at end
      where id = $4
        and organization_id = $5`,
    [
      input.status,
      input.httpStatus ?? null,
      input.errorDetail ?? null,
      input.deliveryId,
      context.organizationId,
    ]
  );
}

export async function incrementEndpointFailureCounter(
  db: Queryable,
  context: TenantContext,
  endpointId: string
): Promise<void> {
  assertTenantContext(context);
  await db.query(
    `update webhook_endpoints
        set consecutive_failures = consecutive_failures + 1,
            updated_at = now()
      where id = $1
        and organization_id = $2`,
    [endpointId, context.organizationId]
  );
}

export async function resetEndpointFailureCounter(
  db: Queryable,
  context: TenantContext,
  endpointId: string
): Promise<void> {
  assertTenantContext(context);
  await db.query(
    `update webhook_endpoints
        set consecutive_failures = 0,
            updated_at = now()
      where id = $1
        and organization_id = $2`,
    [endpointId, context.organizationId]
  );
}

/**
 * Re-arm the circuit breaker after an admin manually re-enables an endpoint.
 * Resets consecutive_failures=0 and clears disabled_at.
 * Called by the PATCH update path when isActive transitions false→true.
 */
export async function clearEndpointCircuitBreakerState(
  db: Queryable,
  context: TenantContext,
  endpointId: string
): Promise<void> {
  assertTenantContext(context);
  await db.query(
    `update webhook_endpoints
        set consecutive_failures = 0,
            disabled_at = null,
            updated_at = now()
      where id = $1
        and organization_id = $2`,
    [endpointId, context.organizationId]
  );
}
