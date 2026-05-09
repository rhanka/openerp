import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";

export async function listAuditEvents(db: Queryable, context: TenantContext, limit = 50) {
  assertTenantContext(context);
  const result = await db.query(
    `select id, action, resource_type, resource_id, created_at
       from audit_events
      where organization_id = $1
      order by created_at desc
      limit $2`,
    [context.organizationId, limit]
  );
  return result.rows;
}

export async function getCurrentOrganization(db: Queryable, context: TenantContext) {
  assertTenantContext(context);
  const result = await db.query(
    `select id, display_name, default_locale, default_currency, default_timezone, country, province_state
       from organizations
      where id = $1`,
    [context.organizationId]
  );
  return result.rows[0] ?? null;
}
