import type { Queryable } from "../db/client";
import type { TenantContext, TenantIsolationStrategy } from "@openerp/domain";

// Row-level RLS implementation of TenantIsolationStrategy (PG-03).
// `applyScope` sets a session-local Postgres setting that all RLS policies on
// tenant-owned tables read via app_current_organization_id() (see migration 0003).
//
// The abstraction supports swapping to schema-per-tenant or DB-per-tenant later
// without touching call sites — applyScope/releaseScope is the only contract.

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class TenantScopeViolationError extends Error {
  readonly code = "TENANT_SCOPE_VIOLATION";
  constructor(message: string) {
    super(message);
  }
}

export function createRowLevelRlsStrategy(db: Queryable): TenantIsolationStrategy {
  return {
    async applyScope(ctx: TenantContext) {
      if (!UUID_REGEX.test(ctx.organizationId)) {
        throw new TenantScopeViolationError(
          `Refusing to apply scope: organizationId is not a valid UUID ('${ctx.organizationId}')`
        );
      }
      // set_config(name, value, is_local) — is_local=true makes it transaction-scoped.
      await db.query("select set_config('app.current_organization_id', $1, true)", [
        ctx.organizationId
      ]);
    },

    async releaseScope(_ctx: TenantContext) {
      // is_local settings drop at transaction end. We still reset explicitly so
      // long-lived connections without an outer transaction stay clean.
      await db.query("select set_config('app.current_organization_id', '', false)", []);
    }
  };
}
