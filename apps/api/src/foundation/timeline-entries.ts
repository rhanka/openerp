import type { PayloadSummary, TimelineEntry } from "@openerp/domain";
import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";
import { assertEntryType } from "./entry-type-grammar";

// Repository for TimelineEntry (PG-06 article 2). Projection lisible par humain,
// distincte d'AuditEvent (compliance immutable) et de DomainEvent (intégration).
// Tenant-scoped.

const TE_COLUMNS = `
  id,
  organization_id as "organizationId",
  resource_type as "resourceType",
  resource_id as "resourceId",
  actor_user_identity_id as "actorUserIdentityId",
  entry_type as "entryType",
  payload_summary as "payloadSummary",
  occurred_at as "occurredAt"
`;

export interface InsertTimelineEntryInput {
  resourceType: string;
  resourceId: string;
  actorUserIdentityId: string | null;
  entryType: string;
  payloadSummary: PayloadSummary;
  occurredAt?: string;
}

export async function insertTimelineEntry(
  db: Queryable,
  context: TenantContext,
  input: InsertTimelineEntryInput
): Promise<TimelineEntry> {
  assertTenantContext(context);
  assertEntryType(input.entryType);
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const result = await db.query<TimelineEntry>(
    `insert into timeline_entries (
       organization_id, resource_type, resource_id, actor_user_identity_id,
       entry_type, payload_summary, occurred_at
     ) values ($1, $2, $3, $4, $5, $6, $7)
     returning ${TE_COLUMNS}`,
    [
      context.organizationId,
      input.resourceType,
      input.resourceId,
      input.actorUserIdentityId,
      input.entryType,
      input.payloadSummary,
      occurredAt
    ]
  );
  return result.rows[0]!;
}

export interface ListTimelineQuery {
  resourceType: string;
  resourceId: string;
  occurredAfter?: string;
  occurredBefore?: string;
  entryTypes?: string[];
  limit?: number;
}

export async function listTimelineEntriesForResource(
  db: Queryable,
  context: TenantContext,
  query: ListTimelineQuery
): Promise<TimelineEntry[]> {
  assertTenantContext(context);
  const filters: string[] = ["organization_id = $1", "resource_type = $2", "resource_id = $3"];
  const values: unknown[] = [context.organizationId, query.resourceType, query.resourceId];
  let i = 4;
  if (query.occurredAfter) {
    filters.push(`occurred_at >= $${i++}`);
    values.push(query.occurredAfter);
  }
  if (query.occurredBefore) {
    filters.push(`occurred_at <= $${i++}`);
    values.push(query.occurredBefore);
  }
  if (query.entryTypes && query.entryTypes.length > 0) {
    for (const t of query.entryTypes) assertEntryType(t);
    filters.push(`entry_type = any($${i++}::text[])`);
    values.push(query.entryTypes);
  }
  const limit = query.limit ?? 100;
  const result = await db.query<TimelineEntry>(
    `select ${TE_COLUMNS}
       from timeline_entries
      where ${filters.join(" and ")}
      order by occurred_at desc
      limit $${i}`,
    [...values, limit]
  );
  return result.rows;
}
