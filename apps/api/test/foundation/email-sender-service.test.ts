import { describe, expect, it } from "vitest";

import type { EmailSend } from "@sentropic/openerp-domain";
import type { Queryable } from "../../src/db/client";
import {
  EmailSendFailedError,
  noopEmailSender,
  sendEmail,
  type EmailSender,
  type EmailSendResult
} from "../../src/foundation/email-sender";

interface AuditRow {
  action: string;
  resourceType: string;
  resourceId: string;
}

function makeFakeDb() {
  const emailSends: EmailSend[] = [];
  const audits: AuditRow[] = [];
  let nextId = 1;

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text.trim();

      // find by idempotency key
      if (t.includes("from email_sends") && t.includes("where organization_id = $1 and idempotency_key = $2")) {
        const [organizationId, idempotencyKey] = values as [string, string];
        const found = emailSends.find(
          (e) => e.organizationId === organizationId && e.idempotencyKey === idempotencyKey
        );
        return { rows: found ? [found as unknown as T] : [] };
      }

      // insert
      if (t.includes("insert into email_sends")) {
        const [organizationId, toAddress, subject, kind, resourceType, resourceId, provider, idempotencyKey] =
          values as [string, string, string, string, string | null, string | null, string, string];
        const row: EmailSend = {
          id: `es_${nextId++}`,
          organizationId,
          toAddress,
          subject,
          kind,
          resourceType,
          resourceId,
          status: "queued",
          provider,
          idempotencyKey,
          error: null,
          sentAt: null,
          createdAt: "2026-07-16T10:00:00.000Z",
          updatedAt: "2026-07-16T10:00:00.000Z"
        };
        emailSends.push(row);
        return { rows: [row as unknown as T] };
      }

      // update to sent
      if (t.includes("update email_sends") && t.includes("status = 'sent'")) {
        const [id, organizationId, providerId] = values as [string, string, string];
        const row = emailSends.find((e) => e.id === id && e.organizationId === organizationId);
        if (!row) return { rows: [] };
        row.status = "sent";
        row.sentAt = "2026-07-16T10:00:01.000Z";
        row.provider = providerId;
        row.updatedAt = "2026-07-16T10:00:01.000Z";
        return { rows: [row as unknown as T] };
      }

      // update to failed
      if (t.includes("update email_sends") && t.includes("status = 'failed'")) {
        const [id, organizationId, errorMessage] = values as [string, string, string];
        const row = emailSends.find((e) => e.id === id && e.organizationId === organizationId);
        if (!row) return { rows: [] };
        row.status = "failed";
        row.error = errorMessage;
        row.updatedAt = "2026-07-16T10:00:01.000Z";
        return { rows: [row as unknown as T] };
      }

      // audit_events
      if (t.includes("insert into audit_events")) {
        const action = values[3] as string;
        const resourceType = values[4] as string;
        const resourceId = values[5] as string;
        audits.push({ action, resourceType, resourceId });
        return { rows: [{ id: `ae_${audits.length}` } as unknown as T] };
      }

      return { rows: [] };
    }
  };

  return { db, emailSends, audits };
}

const TENANT = { organizationId: "org-1", actorUserId: "user-1" };

const MESSAGE = {
  toAddress: "client@example.com",
  subject: "Invoice INV-000001 issued",
  kind: "invoice_issued",
  resourceType: "invoice",
  resourceId: "inv-1",
  body: "Please find your invoice attached."
};

function makeCountingSender(result: EmailSendResult = { providerId: "noop" }): EmailSender & { calls: number } {
  return {
    id: "noop",
    calls: 0,
    async send(): Promise<EmailSendResult> {
      this.calls += 1;
      return result;
    }
  };
}

describe("email-sender service (D6) — unit", () => {
  it("happy path: inserts a queued row, marks it sent, and emits an audit event", async () => {
    const { db, emailSends, audits } = makeFakeDb();

    const result = await sendEmail(db, TENANT, { ...MESSAGE, idempotencyKey: "idem-1" }, noopEmailSender);

    expect(result.status).toBe("sent");
    expect(result.provider).toBe("noop");
    expect(result.sentAt).not.toBeNull();
    expect(result.toAddress).toBe(MESSAGE.toAddress);
    expect(result.idempotencyKey).toBe("idem-1");

    expect(emailSends).toHaveLength(1);
    expect(emailSends[0]!.status).toBe("sent");

    expect(audits.some((a) => a.action === "foundation.email_send.sent" && a.resourceId === result.id)).toBe(true);
    expect(audits).toHaveLength(1);
  });

  it("idempotent replay: the same idempotencyKey returns the existing row and does not call sender.send() again", async () => {
    const { db } = makeFakeDb();
    const sender = makeCountingSender();

    const first = await sendEmail(db, TENANT, { ...MESSAGE, idempotencyKey: "idem-replay" }, sender);
    expect(sender.calls).toBe(1);

    const second = await sendEmail(db, TENANT, { ...MESSAGE, idempotencyKey: "idem-replay" }, sender);
    expect(sender.calls).toBe(1);
    expect(second).toEqual(first);
  });

  it("provider failure: marks the row failed, records the error, throws EmailSendFailedError, and emits an audit event", async () => {
    const { db, emailSends, audits } = makeFakeDb();
    const failingSender: EmailSender = {
      id: "noop",
      async send(): Promise<EmailSendResult> {
        throw new Error("SMTP relay unreachable");
      }
    };

    await expect(
      sendEmail(db, TENANT, { ...MESSAGE, idempotencyKey: "idem-fail" }, failingSender)
    ).rejects.toBeInstanceOf(EmailSendFailedError);

    expect(emailSends).toHaveLength(1);
    expect(emailSends[0]!.status).toBe("failed");
    expect(emailSends[0]!.error).toContain("SMTP relay unreachable");

    expect(audits.some((a) => a.action === "foundation.email_send.failed")).toBe(true);
  });

  it("rejects an empty tenant context", async () => {
    const { db } = makeFakeDb();

    await expect(
      sendEmail(
        db,
        { organizationId: "", actorUserId: "" },
        { ...MESSAGE, idempotencyKey: "idem-empty" },
        noopEmailSender
      )
    ).rejects.toThrow();
  });
});
