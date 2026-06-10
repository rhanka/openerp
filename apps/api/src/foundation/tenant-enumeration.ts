import type { Queryable } from "../db/client";

/**
 * Enumerate all active organization ids.
 *
 * RLS-BYPASS DELIBERATE: this helper queries `organizations` WITHOUT setting
 * `app.current_organization_id`. It MUST only be called from the worker
 * bootstrap (before per-tenant `applyScope`) or from privileged service-role
 * paths. Audit owners: search callers when reviewing tenant isolation.
 *
 * Returns ids ordered by `created_at ASC` for deterministic per-tick iteration.
 */
export async function listActiveOrganizationIds(db: Queryable): Promise<string[]> {
  interface Row { id: string; }
  const result = await db.query<Row>(
    `select id from organizations where deleted_at is null order by created_at asc`
  );
  return result.rows.map((r) => r.id);
}
