import type { AuthHonoAuditLevel, AuthHonoAuditLogPort } from "@sentropic/auth-hono";
import type { Queryable } from "../db/client.js";
import { recordSystemAuditEvent } from "../foundation/audit-emit.js";

// AuthHonoAuditLogPort — bridges auth-hono's (level, event, fields) interface to
// Authentication events occur before a valid organization or user selection.
// The Lot 1 migration provides an explicit nullable system representation;
// delivery failures are intentionally observable to callers.

export function createOpenERPAuditLogPort(db: Queryable): AuthHonoAuditLogPort {
  return {
    async record(
      level: AuthHonoAuditLevel,
      event: string,
      fields?: Record<string, unknown>
    ): Promise<void> {
      await recordSystemAuditEvent(db, {
        action: event,
        resourceType: "auth",
        resourceId: event,
        afterSummary: { level, ...(fields ?? {}) },
      });
    },
  };
}
