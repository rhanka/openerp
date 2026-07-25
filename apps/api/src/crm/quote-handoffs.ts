import type {
  CreateQuoteHandoffInput,
  QuoteHandoff,
  QuoteHandoffStatus
} from "@sentropic/openerp-domain/crm";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";

const HANDOFF_RETURN_COLUMNS = `
  id,
  organization_id as "organizationId",
  opportunity_id as "opportunityId",
  target_type as "targetType",
  status,
  requested_by_user_id as "requestedByUserId",
  to_char(accepted_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "acceptedAt",
  to_char(deleted_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "deletedAt",
  to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt",
  to_char(updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "updatedAt"
`;

export async function insertQuoteHandoff(
  db: Queryable,
  context: TenantContext,
  input: CreateQuoteHandoffInput
): Promise<QuoteHandoff> {
  assertTenantContext(context);
  const result = await db.query<QuoteHandoff>(
    `insert into quote_handoffs (
       organization_id, opportunity_id, target_type, status, requested_by_user_id
     ) values ($1, $2, $3, 'pending', $4)
     returning ${HANDOFF_RETURN_COLUMNS}`,
    [
      context.organizationId,
      input.opportunityId,
      input.targetType,
      input.requestedByUserId ?? null
    ]
  );
  return result.rows[0]!;
}

export async function findQuoteHandoffById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<QuoteHandoff | null> {
  assertTenantContext(context);
  const result = await db.query<QuoteHandoff>(
    `select ${HANDOFF_RETURN_COLUMNS}
       from quote_handoffs
      where id = $1 and organization_id = $2 and deleted_at is null`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}

export async function listQuoteHandoffs(
  db: Queryable,
  context: TenantContext,
  options: {
    opportunityId?: string;
    status?: QuoteHandoffStatus;
    limit?: number;
    offset?: number;
  } = {}
): Promise<QuoteHandoff[]> {
  assertTenantContext(context);
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const offset = Math.max(options.offset ?? 0, 0);
  const filterOpportunityId = options.opportunityId ?? null;
  const filterStatus = options.status ?? null;
  const result = await db.query<QuoteHandoff>(
    `select ${HANDOFF_RETURN_COLUMNS}
       from quote_handoffs
      where organization_id = $1
        and ($2::uuid is null or opportunity_id = $2)
        and ($3::text is null or status = $3)
        and deleted_at is null
      order by created_at desc
      limit $4 offset $5`,
    [context.organizationId, filterOpportunityId, filterStatus, limit, offset]
  );
  return result.rows;
}

export async function updateQuoteHandoffStatus(
  db: Queryable,
  context: TenantContext,
  id: string,
  status: QuoteHandoffStatus,
  extra: { acceptedAt?: string | null } = {}
): Promise<QuoteHandoff | null> {
  assertTenantContext(context);
  const sets = ["status = $3", "updated_at = now()"];
  const values: unknown[] = [id, context.organizationId, status];
  if (extra.acceptedAt !== undefined) {
    sets.push(`accepted_at = $${values.length + 1}`);
    values.push(extra.acceptedAt);
  }
  const result = await db.query<QuoteHandoff>(
    `update quote_handoffs
        set ${sets.join(", ")}
      where id = $1 and organization_id = $2 and deleted_at is null
      returning ${HANDOFF_RETURN_COLUMNS}`,
    values
  );
  return result.rows[0] ?? null;
}

export async function softDeleteQuoteHandoff(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<{ id: string } | null> {
  assertTenantContext(context);
  const result = await db.query<{ id: string }>(
    `update quote_handoffs
        set deleted_at = now(), updated_at = now()
      where id = $1 and organization_id = $2 and deleted_at is null
      returning id`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}
