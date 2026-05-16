import type { AuditEvent } from "@sentropic/openerp-domain";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";

const AUDIT_COLUMNS = `
  id,
  organization_id as "organizationId",
  actor_user_id as "actorUserId",
  actor_type as "actorType",
  action,
  resource_type as "resourceType",
  resource_id as "resourceId",
  before_summary as "beforeSummary",
  after_summary as "afterSummary",
  ip_hash as "ipHash",
  user_agent_hash as "userAgentHash",
  created_at as "createdAt"
`;

export interface ListAuditEventsFilters {
  /** Max rows to return. Server clamps to 1..200. Default 50. */
  limit?: number;
  /** Restrict to a single action verb (e.g. "approval_request.created"). */
  action?: string;
  /** Restrict to a single resource type (e.g. "approval_request"). */
  resourceType?: string;
  /** Restrict to a single actor user identity. */
  actorUserId?: string;
  /** Lower bound (inclusive). ISO-8601 timestamp. */
  fromCreatedAt?: string;
  /** Upper bound (inclusive). ISO-8601 timestamp. */
  toCreatedAt?: string;
}

const MAX_AUDIT_LIMIT = 200;
const DEFAULT_AUDIT_LIMIT = 50;

export async function listAuditEvents(
  db: Queryable,
  context: TenantContext,
  filters: ListAuditEventsFilters = {}
): Promise<AuditEvent[]> {
  assertTenantContext(context);
  const limit = clampLimit(filters.limit);
  const params: unknown[] = [context.organizationId];
  const where: string[] = ["organization_id = $1"];
  if (filters.action) {
    params.push(filters.action);
    where.push(`action = $${params.length}`);
  }
  if (filters.resourceType) {
    params.push(filters.resourceType);
    where.push(`resource_type = $${params.length}`);
  }
  if (filters.actorUserId) {
    params.push(filters.actorUserId);
    where.push(`actor_user_id = $${params.length}`);
  }
  if (filters.fromCreatedAt) {
    params.push(filters.fromCreatedAt);
    where.push(`created_at >= $${params.length}`);
  }
  if (filters.toCreatedAt) {
    params.push(filters.toCreatedAt);
    where.push(`created_at <= $${params.length}`);
  }
  params.push(limit);
  const sql = `
    select ${AUDIT_COLUMNS}
      from audit_events
     where ${where.join(" and ")}
     order by created_at desc
     limit $${params.length}
  `;
  const result = await db.query<AuditEvent>(sql, params);
  return result.rows;
}

function clampLimit(raw: number | undefined): number {
  if (raw === undefined || Number.isNaN(raw)) return DEFAULT_AUDIT_LIMIT;
  if (raw < 1) return 1;
  if (raw > MAX_AUDIT_LIMIT) return MAX_AUDIT_LIMIT;
  return Math.floor(raw);
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
