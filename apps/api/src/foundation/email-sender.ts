import type { EmailSend } from "@sentropic/openerp-domain";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";
import { recordAuditEvent, recordSystemAuditEvent } from "./audit-emit";

// EmailSender PORT + audited, idempotent send journal (D6 — owner-ratified in
// docs/studies/2026-07-11-wave-replacement-decisions.md). A concrete transport
// is supplied by the composition root. This module never silently substitutes
// a configured transport with a log-only or always-success implementation.

const EMAIL_SEND_COLUMNS = `
  id,
  organization_id as "organizationId",
  to_address as "toAddress",
  subject,
  kind,
  resource_type as "resourceType",
  resource_id as "resourceId",
  status,
  provider,
  idempotency_key as "idempotencyKey",
  error,
  to_char(sent_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "sentAt",
  to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt",
  to_char(updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "updatedAt"
`;

export interface EmailMessage {
  toAddress: string;
  subject: string;
  kind: string;
  resourceType?: string | null;
  resourceId?: string | null;
  body: string;
}

export interface EmailSendResult {
  providerId: string;
}

export interface EmailSender {
  readonly id: string;
  send(message: EmailMessage): Promise<EmailSendResult>;
}

/** Thrown when delivery did not complete. The journal has a durable terminal
 * status when a provider failure occurs, and an existing queued row fails
 * closed instead of being misreported as a successful idempotent replay. */
export class EmailSendFailedError extends Error {
  readonly code = "EMAIL_SEND_FAILED";
  readonly emailSendId: string;
  constructor(emailSendId: string, idempotencyKey: string, cause: unknown) {
    super(
      `Email send failed for idempotencyKey=${idempotencyKey}: ${
        cause instanceof Error ? cause.message : String(cause)
      }`
    );
    this.emailSendId = emailSendId;
  }
}

function requireCompletedDelivery(existing: EmailSend, idempotencyKey: string): EmailSend {
  if (existing.status === "sent") return existing;

  const reason = existing.status === "failed"
    ? existing.error ?? "the recorded provider failure has no message"
    : "the earlier delivery is still queued and cannot be safely replayed";
  throw new EmailSendFailedError(existing.id, idempotencyKey, new Error(reason));
}

async function findTenantEmailSendByIdempotencyKey(
  db: Queryable,
  organizationId: string,
  idempotencyKey: string
): Promise<EmailSend | null> {
  const result = await db.query<EmailSend>(
    `select ${EMAIL_SEND_COLUMNS}
       from email_sends
      where organization_id = $1 and idempotency_key = $2`,
    [organizationId, idempotencyKey]
  );
  return result.rows[0] ?? null;
}

/**
 * Send a tenant email through the audited, idempotent journal.
 *
 * Only a successfully sent row is an idempotent success. Failed and queued
 * replays reject, so callers cannot treat an undelivered message as sent.
 */
export async function sendEmail(
  db: Queryable,
  context: TenantContext,
  input: EmailMessage & { idempotencyKey: string },
  sender: EmailSender
): Promise<EmailSend> {
  assertTenantContext(context);
  const existing = await findTenantEmailSendByIdempotencyKey(
    db,
    context.organizationId,
    input.idempotencyKey
  );
  if (existing) return requireCompletedDelivery(existing, input.idempotencyKey);

  const insertResult = await db.query<EmailSend>(
    `insert into email_sends (
       organization_id, to_address, subject, kind, resource_type, resource_id,
       status, provider, idempotency_key
     ) values ($1, $2, $3, $4, $5, $6, 'queued', $7, $8)
     returning ${EMAIL_SEND_COLUMNS}`,
    [
      context.organizationId,
      input.toAddress,
      input.subject,
      input.kind,
      input.resourceType ?? null,
      input.resourceId ?? null,
      sender.id,
      input.idempotencyKey
    ]
  );
  const queued = insertResult.rows[0];
  if (!queued) throw new Error("sendEmail: insert into email_sends returned no row");

  let providerResult: EmailSendResult;
  try {
    providerResult = await sender.send(toProviderMessage(input));
  } catch (cause) {
    await markTenantEmailFailed(db, context.organizationId, queued.id, errorMessage(cause));
    await recordTenantEmailAudit(db, context, "foundation.email_send.failed", queued, errorMessage(cause));
    throw new EmailSendFailedError(queued.id, input.idempotencyKey, cause);
  }

  const sent = await markTenantEmailSent(db, context.organizationId, queued.id, providerResult.providerId);
  await recordTenantEmailAudit(db, context, "foundation.email_send.sent", sent);
  return sent;
}

/**
 * Send pre-tenant authentication mail through the same audited journal. Its
 * SQL path consists exclusively of migration-owned SECURITY DEFINER functions
 * that are constrained to NULL-organization rows.
 */
export async function sendSystemEmail(
  db: Queryable,
  input: EmailMessage & { idempotencyKey: string },
  sender: EmailSender
): Promise<EmailSend> {
  const existing = await findSystemEmailSendByIdempotencyKey(db, input.idempotencyKey);
  if (existing) return requireCompletedDelivery(existing, input.idempotencyKey);

  const queuedResult = await db.query<EmailSend>(
    `select ${EMAIL_SEND_COLUMNS}
       from auth_system_email_enqueue($1, $2, $3, $4, $5, $6, $7)`,
    [
      input.toAddress,
      input.subject,
      input.kind,
      input.resourceType ?? null,
      input.resourceId ?? null,
      sender.id,
      input.idempotencyKey
    ]
  );
  const queued = queuedResult.rows[0];
  if (!queued) throw new Error("sendSystemEmail: enqueue returned no row");

  // A concurrent request may have won the enqueue race. It is only a success
  // when the durable journal says the transport actually completed.
  if (queued.status !== "queued") return requireCompletedDelivery(queued, input.idempotencyKey);

  let providerResult: EmailSendResult;
  try {
    providerResult = await sender.send(toProviderMessage(input));
  } catch (cause) {
    await markSystemEmailFailed(db, queued.id, errorMessage(cause));
    await recordSystemEmailAudit(db, "foundation.email_send.failed", queued, errorMessage(cause));
    throw new EmailSendFailedError(queued.id, input.idempotencyKey, cause);
  }

  const sent = await markSystemEmailSent(db, queued.id, providerResult.providerId);
  await recordSystemEmailAudit(db, "foundation.email_send.sent", sent);
  return sent;
}

function toProviderMessage(input: EmailMessage): EmailMessage {
  return {
    toAddress: input.toAddress,
    subject: input.subject,
    kind: input.kind,
    resourceType: input.resourceType ?? null,
    resourceId: input.resourceId ?? null,
    body: input.body
  };
}

function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

async function markTenantEmailSent(
  db: Queryable,
  organizationId: string,
  id: string,
  providerId: string
): Promise<EmailSend> {
  const result = await db.query<EmailSend>(
    `update email_sends
        set status = 'sent', sent_at = now(), provider = $3, updated_at = now()
      where id = $1 and organization_id = $2
      returning ${EMAIL_SEND_COLUMNS}`,
    [id, organizationId, providerId]
  );
  const sent = result.rows[0];
  if (!sent) throw new Error("sendEmail: update to 'sent' returned no row");
  return sent;
}

async function markTenantEmailFailed(
  db: Queryable,
  organizationId: string,
  id: string,
  failure: string
): Promise<void> {
  await db.query<EmailSend>(
    `update email_sends
        set status = 'failed', error = $3, updated_at = now()
      where id = $1 and organization_id = $2
      returning ${EMAIL_SEND_COLUMNS}`,
    [id, organizationId, failure]
  );
}

async function findSystemEmailSendByIdempotencyKey(
  db: Queryable,
  idempotencyKey: string
): Promise<EmailSend | null> {
  const result = await db.query<EmailSend>(
    `select ${EMAIL_SEND_COLUMNS} from auth_system_email_find($1)`,
    [idempotencyKey]
  );
  return result.rows[0] ?? null;
}

async function markSystemEmailSent(db: Queryable, id: string, providerId: string): Promise<EmailSend> {
  const result = await db.query<EmailSend>(
    `select ${EMAIL_SEND_COLUMNS} from auth_system_email_mark_sent($1, $2)`,
    [id, providerId]
  );
  const sent = result.rows[0];
  if (!sent) throw new Error("sendSystemEmail: update to 'sent' returned no row");
  return sent;
}

async function markSystemEmailFailed(db: Queryable, id: string, failure: string): Promise<void> {
  await db.query<EmailSend>(
    `select ${EMAIL_SEND_COLUMNS} from auth_system_email_mark_failed($1, $2)`,
    [id, failure]
  );
}

async function recordTenantEmailAudit(
  db: Queryable,
  context: TenantContext,
  action: "foundation.email_send.sent" | "foundation.email_send.failed",
  email: EmailSend,
  error?: string
): Promise<void> {
  await recordAuditEvent(db, context, {
    action,
    resourceType: "email_send",
    resourceId: email.id,
    beforeSummary: null,
    afterSummary: {
      toAddress: email.toAddress,
      kind: email.kind,
      ...(action === "foundation.email_send.sent" ? { provider: email.provider } : { error })
    }
  });
}

async function recordSystemEmailAudit(
  db: Queryable,
  action: "foundation.email_send.sent" | "foundation.email_send.failed",
  email: EmailSend,
  error?: string
): Promise<void> {
  await recordSystemAuditEvent(db, {
    action,
    resourceType: "email_send",
    resourceId: email.id,
    afterSummary: {
      toAddress: email.toAddress,
      kind: email.kind,
      ...(action === "foundation.email_send.sent" ? { provider: email.provider } : { error })
    }
  });
}
