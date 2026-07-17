import type { EmailSend } from "@sentropic/openerp-domain";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";
import { recordAuditEvent } from "./audit-emit";

// EmailSender PORT + audited, idempotent send journal (D6 — owner-ratified in
// docs/studies/2026-07-11-wave-replacement-decisions.md).
//
// Scope: this is the port + journal only. The concrete SMTP provider is a
// PENDING OWNER DECISION — do not add nodemailer or any SMTP client here.
// Until that decision lands, `noopEmailSender` is the only implementation:
// it performs no external I/O and simply acknowledges the message.
//
// Keep this module free of billing/CRM/project domain types — it belongs to
// foundation, not to any feature module.

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
  sent_at as "sentAt",
  created_at as "createdAt",
  updated_at as "updatedAt"
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

/**
 * No-op EmailSender. Records nothing externally and never fails — it simply
 * acknowledges the message with a fixed provider id.
 *
 * This is a placeholder: a real SMTP (or other transactional-email) provider
 * is a pending owner decision (D6). Swap this default once that decision is
 * ratified; the `sendEmail` journal below is provider-agnostic and requires
 * no changes.
 */
export const noopEmailSender: EmailSender = {
  id: "noop",
  async send(_message: EmailMessage): Promise<EmailSendResult> {
    return { providerId: "noop" };
  }
};

/** Thrown by sendEmail when the underlying EmailSender.send() call fails.
 *  The failure is always recorded on the journal row (status='failed',
 *  error set) and audited before this error is thrown. */
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

async function findEmailSendByIdempotencyKey(
  db: Queryable,
  context: TenantContext,
  idempotencyKey: string
): Promise<EmailSend | null> {
  const result = await db.query<EmailSend>(
    `select ${EMAIL_SEND_COLUMNS}
       from email_sends
      where organization_id = $1 and idempotency_key = $2`,
    [context.organizationId, idempotencyKey]
  );
  return result.rows[0] ?? null;
}

/**
 * Send an email through the audited, idempotent journal.
 *
 * Idempotency: if a row already exists for (organizationId, idempotencyKey),
 * it is returned as-is — sender.send() is NOT called again and no new audit
 * event is emitted.
 *
 * Otherwise: insert a 'queued' row, call sender.send(), then mark the row
 * 'sent' (+ sentAt, provider) on success or 'failed' (+ error) on failure.
 * Both outcomes emit a recordAuditEvent. A provider failure never escapes as
 * a raw/unhandled error — it is recorded and rethrown as EmailSendFailedError.
 */
export async function sendEmail(
  db: Queryable,
  context: TenantContext,
  input: EmailMessage & { idempotencyKey: string },
  sender: EmailSender = noopEmailSender
): Promise<EmailSend> {
  assertTenantContext(context);

  const existing = await findEmailSendByIdempotencyKey(db, context, input.idempotencyKey);
  if (existing) {
    return existing;
  }

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
  if (!queued) {
    throw new Error("sendEmail: insert into email_sends returned no row");
  }

  try {
    const result = await sender.send({
      toAddress: input.toAddress,
      subject: input.subject,
      kind: input.kind,
      resourceType: input.resourceType ?? null,
      resourceId: input.resourceId ?? null,
      body: input.body
    });

    const sentResult = await db.query<EmailSend>(
      `update email_sends
          set status = 'sent', sent_at = now(), provider = $3, updated_at = now()
        where id = $1 and organization_id = $2
        returning ${EMAIL_SEND_COLUMNS}`,
      [queued.id, context.organizationId, result.providerId]
    );
    const sent = sentResult.rows[0];
    if (!sent) {
      throw new Error("sendEmail: update to 'sent' returned no row");
    }

    await recordAuditEvent(db, context, {
      action: "foundation.email_send.sent",
      resourceType: "email_send",
      resourceId: sent.id,
      beforeSummary: null,
      afterSummary: { toAddress: sent.toAddress, kind: sent.kind, provider: sent.provider }
    });

    return sent;
  } catch (cause) {
    const errorMessage = cause instanceof Error ? cause.message : String(cause);
    await db.query<EmailSend>(
      `update email_sends
          set status = 'failed', error = $3, updated_at = now()
        where id = $1 and organization_id = $2
        returning ${EMAIL_SEND_COLUMNS}`,
      [queued.id, context.organizationId, errorMessage]
    );

    await recordAuditEvent(db, context, {
      action: "foundation.email_send.failed",
      resourceType: "email_send",
      resourceId: queued.id,
      beforeSummary: null,
      afterSummary: { toAddress: queued.toAddress, kind: queued.kind, error: errorMessage }
    });

    throw new EmailSendFailedError(queued.id, input.idempotencyKey, cause);
  }
}
