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
 *
 * "Active" is `status = 'active'`. An organization is suspended through
 * `organizations.status` (constrained to 'active' or 'suspended' since
 * migration 0001); it is never soft-deleted, and the table has no
 * `deleted_at` column. This query previously filtered `deleted_at is null`,
 * which made it raise `column "deleted_at" does not exist` on every call.
 * Since it is the first query every worker tick runs, that killed all four
 * tick loops in dev and prod while the unit test stayed green.
 */
export async function listActiveOrganizationIds(db: Queryable): Promise<string[]> {
  interface Row { id: string; }
  const result = await db.query<Row>(
    `select id from organizations where status = 'active' order by created_at asc`
  );
  return result.rows.map((r) => r.id);
}
