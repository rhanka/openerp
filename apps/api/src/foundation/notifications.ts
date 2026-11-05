import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";

// Minimal in-app notification repository.
// The notifications table was created in migration 0001_foundation.sql.
// This service provides the insertNotification function consumed by workflow actions.

export interface Notification {
  id: string;
  organizationId: string;
  recipientUserId: string;
  channel: "in_app";
  subjectKey: string;
  bodyKey: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface InsertNotificationInput {
  recipientUserId: string;
  channel?: "in_app";
  subjectKey: string;
  bodyKey: string;
  payload?: Record<string, unknown>;
}

export async function insertNotification(
  db: Queryable,
  context: TenantContext,
  input: InsertNotificationInput
): Promise<Notification> {
  assertTenantContext(context);
  const result = await db.query<Notification>(
    `insert into notifications (
       organization_id, recipient_user_id, channel, subject_key, body_key, payload, status
     ) values ($1, $2, $3, $4, $5, $6::jsonb, 'unread')
     returning
       id,
       organization_id as "organizationId",
       recipient_user_id as "recipientUserId",
       channel,
       subject_key as "subjectKey",
       body_key as "bodyKey",
       payload,
       to_char(read_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "readAt",
       to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt"`,
    [
      context.organizationId,
      input.recipientUserId,
      input.channel ?? "in_app",
      input.subjectKey,
      input.bodyKey,
      JSON.stringify(input.payload ?? {})
    ]
  );
  return result.rows[0]!;
}
