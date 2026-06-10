import { randomBytes } from "node:crypto";

import type {
  WebhookEndpoint,
  WebhookDelivery,
  CreateWebhookEndpointInput,
  CreateWebhookEndpointResult,
  UpdateWebhookEndpointInput
} from "@sentropic/openerp-domain/webhook";
import { WEBHOOK_EVENT_TYPE_SET } from "@sentropic/openerp-domain/webhook";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";
import { recordAuditEvent } from "../foundation/audit-emit";
import {
  insertWebhookEndpoint,
  findWebhookEndpointById,
  listWebhookEndpoints as listWebhookEndpointsRepo,
  updateWebhookEndpointRepo,
  softDeleteWebhookEndpoint,
  rotateWebhookEndpointSecret,
  insertWebhookDelivery,
  listDeliveriesByEndpoint as listDeliveriesByEndpointRepo,
  findWebhookDeliveryById as findWebhookDeliveryByIdRepo,
  clearEndpointCircuitBreakerState,
} from "./webhook-endpoints";
import { signPayload, buildDeliveryPayload, canonicalizePayload } from "./webhook-signer";
import { findWebhookEndpointByIdWithSecret } from "./webhook-endpoints";

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class WebhookEndpointNotFoundError extends Error {
  readonly code = "WEBHOOK_ENDPOINT_NOT_FOUND";
  constructor(id: string) {
    super(`WebhookEndpoint ${id} not found`);
  }
}

export class InvalidWebhookUrlError extends Error {
  readonly code = "INVALID_WEBHOOK_URL";
  constructor(url: string) {
    super(`Webhook targetUrl must start with https://: ${url}`);
  }
}

export class UnknownWebhookEventTypeError extends Error {
  readonly code = "UNKNOWN_WEBHOOK_EVENT_TYPE";
  constructor(eventType: string) {
    super(`Unknown webhook event type: ${eventType}`);
  }
}

export class WebhookForbiddenError extends Error {
  readonly code = "FORBIDDEN";
  constructor(message = "Access denied") {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateInput(input: { targetUrl: string; eventTypes: string[] }): void {
  if (!input.targetUrl.startsWith("https://")) {
    throw new InvalidWebhookUrlError(input.targetUrl);
  }
  for (const et of input.eventTypes) {
    if (!WEBHOOK_EVENT_TYPE_SET.has(et)) {
      throw new UnknownWebhookEventTypeError(et);
    }
  }
}

// ---------------------------------------------------------------------------
// Ownership enforcement
// A shared WebhookEndpoint may only be mutated by its owner.
// ---------------------------------------------------------------------------

function enforceOwnership(endpoint: WebhookEndpoint, context: TenantContext): void {
  if (
    endpoint.isShared &&
    endpoint.ownerUserId !== null &&
    endpoint.ownerUserId !== context.actorUserId
  ) {
    throw new WebhookForbiddenError(
      `Only the owner of shared WebhookEndpoint ${endpoint.id} may modify it`
    );
  }
}

function generateSecret(): string {
  return randomBytes(32).toString("hex");
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function createWebhookEndpoint(
  db: Queryable,
  context: TenantContext,
  input: CreateWebhookEndpointInput
): Promise<CreateWebhookEndpointResult> {
  assertTenantContext(context);
  validateInput({ targetUrl: input.targetUrl, eventTypes: input.eventTypes });

  const signingSecret = generateSecret();

  const endpoint = await insertWebhookEndpoint(db, context, {
    ownerUserId: input.ownerUserId ?? null,
    name: input.name,
    targetUrl: input.targetUrl,
    signingSecret,
    eventTypes: input.eventTypes,
    isActive: input.isActive ?? true,
    isShared: input.isShared ?? false
  });

  // afterSummary MUST NOT include signing_secret — explicit field list only.
  await recordAuditEvent(db, context, {
    action: "webhook.webhook_endpoint.created",
    resourceType: "webhook_endpoint",
    resourceId: endpoint.id,
    beforeSummary: null,
    afterSummary: {
      name: endpoint.name,
      targetUrl: endpoint.targetUrl,
      eventTypes: endpoint.eventTypes,
      isActive: endpoint.isActive,
      isShared: endpoint.isShared,
      ownerUserId: endpoint.ownerUserId
    }
  });

  return { ...endpoint, signingSecret };
}

export async function updateWebhookEndpoint(
  db: Queryable,
  context: TenantContext,
  id: string,
  patch: UpdateWebhookEndpointInput
): Promise<WebhookEndpoint> {
  assertTenantContext(context);
  const before = await findWebhookEndpointById(db, context, id);
  if (!before) throw new WebhookEndpointNotFoundError(id);
  enforceOwnership(before, context);

  if (patch.targetUrl !== undefined || patch.eventTypes !== undefined) {
    validateInput({
      targetUrl: patch.targetUrl ?? before.targetUrl,
      eventTypes: patch.eventTypes ?? before.eventTypes
    });
  }

  const updated = await updateWebhookEndpointRepo(db, context, id, patch);
  if (!updated) throw new WebhookEndpointNotFoundError(id);

  // Re-arm circuit breaker: when an admin explicitly re-enables a disabled
  // endpoint, reset consecutive_failures=0 and disabled_at=null so the next
  // delivery attempt is not immediately short-circuited by stale state.
  if (before.isActive === false && patch.isActive === true) {
    await clearEndpointCircuitBreakerState(db, context, id);
  }

  await recordAuditEvent(db, context, {
    action: "webhook.webhook_endpoint.updated",
    resourceType: "webhook_endpoint",
    resourceId: id,
    beforeSummary: {
      name: before.name,
      isActive: before.isActive,
      isShared: before.isShared,
      eventTypes: before.eventTypes
    },
    afterSummary: {
      name: updated.name,
      isActive: updated.isActive,
      isShared: updated.isShared,
      eventTypes: updated.eventTypes
    }
  });

  return updated;
}

export async function deleteWebhookEndpoint(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<void> {
  assertTenantContext(context);
  const before = await findWebhookEndpointById(db, context, id);
  if (!before) throw new WebhookEndpointNotFoundError(id);
  enforceOwnership(before, context);

  const deleted = await softDeleteWebhookEndpoint(db, context, id);
  if (!deleted) throw new WebhookEndpointNotFoundError(id);

  await recordAuditEvent(db, context, {
    action: "webhook.webhook_endpoint.deleted",
    resourceType: "webhook_endpoint",
    resourceId: id,
    beforeSummary: {
      name: before.name,
      targetUrl: before.targetUrl,
      eventTypes: before.eventTypes,
      isActive: before.isActive
    },
    afterSummary: null
  });
}

export async function getWebhookEndpointById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<WebhookEndpoint | null> {
  return findWebhookEndpointById(db, context, id);
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
  return listWebhookEndpointsRepo(db, context, options);
}

/**
 * rotateSecret: generate a new HMAC secret, persist it, return it ONCE.
 * afterSummary MUST NOT include the new secret.
 */
export async function rotateWebhookEndpointSecretService(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<string> {
  assertTenantContext(context);
  const endpoint = await findWebhookEndpointById(db, context, id);
  if (!endpoint) throw new WebhookEndpointNotFoundError(id);
  enforceOwnership(endpoint, context);

  const newSecret = generateSecret();
  const rotated = await rotateWebhookEndpointSecret(db, context, id, newSecret);
  if (!rotated) throw new WebhookEndpointNotFoundError(id);

  await recordAuditEvent(db, context, {
    action: "webhook.webhook_endpoint.updated",
    resourceType: "webhook_endpoint",
    resourceId: id,
    beforeSummary: { name: endpoint.name, secretRotated: true },
    afterSummary: { name: endpoint.name, secretRotated: true }
  });

  return newSecret;
}

/**
 * recordTestDelivery: insert a synthetic test delivery (status='pending_egress').
 * Audited as webhook.webhook_endpoint.updated since it's a manual action on the endpoint.
 */
export async function recordTestDelivery(
  db: Queryable,
  context: TenantContext,
  endpointId: string
): Promise<WebhookDelivery> {
  assertTenantContext(context);
  const endpoint = await findWebhookEndpointByIdWithSecret(db, context, endpointId);
  if (!endpoint) throw new WebhookEndpointNotFoundError(endpointId);

  const payload = buildDeliveryPayload(
    "webhook.test",
    context.organizationId,
    "webhook_endpoint",
    endpointId,
    null
  );
  // Use canonical serialization (sorted keys) for reproducible HMAC.
  const rawBody = canonicalizePayload(payload);
  const now = new Date();
  const signedAtUnix = Math.floor(now.getTime() / 1000);

  // We need a provisional ID for signing — generate a UUID-like placeholder
  // The actual ID is assigned by the DB, so we sign with a temp placeholder
  // and update after insert. Since this is test-only and record-only, we use
  // a deterministic temp id for the signature pre-computation.
  const tempId = "test-" + now.toISOString();
  const signature = signPayload(endpoint.signingSecret, tempId, signedAtUnix, rawBody);

  const delivery = await insertWebhookDelivery(db, context, {
    webhookEndpointId: endpointId,
    eventType: "webhook.test",
    triggerAuditEventId: null,
    payload,
    signature,
    signedAt: now.toISOString()
  });

  return delivery;
}

// ---------------------------------------------------------------------------
// Delivery queries
// ---------------------------------------------------------------------------

export async function listDeliveriesForEndpoint(
  db: Queryable,
  context: TenantContext,
  endpointId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<WebhookDelivery[]> {
  const endpoint = await findWebhookEndpointById(db, context, endpointId);
  if (!endpoint) throw new WebhookEndpointNotFoundError(endpointId);
  return listDeliveriesByEndpointRepo(db, context, endpointId, options);
}

export async function getWebhookDeliveryById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<WebhookDelivery | null> {
  return findWebhookDeliveryByIdRepo(db, context, id);
}
