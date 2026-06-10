import type { AuthHonoAuditLevel, AuthHonoAuditLogPort } from "@sentropic/auth-hono";
import type { Queryable } from "../db/client.js";

// AuthHonoAuditLogPort — bridges auth-hono's (level, event, fields) interface to
// recordAuditEvent. Because recordAuditEvent requires a TenantContext (organizationId +
// actorUserId) that is not available at port construction time, we write directly to
// audit_events with a minimal system context. Non-tenant system events use a reserved
// org "00000000-0000-0000-0000-000000000000" to satisfy the NOT NULL constraint without
// requiring a real org lookup.
//
// This port is used for auth-layer events (login attempts, session creation, etc.)
// which are identity-layer, not tenant-scoped data.

const SYSTEM_ORG_ID = "00000000-0000-0000-0000-000000000000";
const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

export function createOpenERPAuditLogPort(db: Queryable): AuthHonoAuditLogPort {
  return {
    async record(
      level: AuthHonoAuditLevel,
      event: string,
      fields?: Record<string, unknown>
    ): Promise<void> {
      try {
        const afterSummary: Record<string, unknown> = {
          level,
          ...(fields ?? {}),
        };

        const columns = [
          "organization_id",
          "actor_user_id",
          "actor_type",
          "action",
          "resource_type",
          "resource_id",
          "after_summary",
        ];
        const values: unknown[] = [
          SYSTEM_ORG_ID,
          SYSTEM_USER_ID,
          "system",
          event,
          "auth",
          event,
          JSON.stringify(afterSummary),
        ];

        const placeholders = values.map((_, i) => `$${i + 1}`);

        await db.query(
          `insert into audit_events (${columns.join(", ")}) values (${placeholders.join(", ")})`,
          values
        );
      } catch {
        // Best-effort: auth-layer audit failures must never block authentication.
      }
    },
  };
}
