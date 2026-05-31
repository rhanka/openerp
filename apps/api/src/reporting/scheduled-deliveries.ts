import type {
  DeliveryRun,
  ScheduledDelivery,
  CreateScheduledDeliveryInput,
  UpdateScheduledDeliveryInput
} from "@sentropic/openerp-domain/reporting";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";

// Repository for ScheduledDelivery and DeliveryRun entities.

const SCHEDULED_DELIVERY_RETURN_COLUMNS = `
  id,
  organization_id as "organizationId",
  owner_user_id as "ownerUserId",
  name,
  target_type as "targetType",
  target_id as "targetId",
  cadence,
  timezone,
  next_run_at as "nextRunAt",
  last_run_at as "lastRunAt",
  channel,
  recipient_user_ids as "recipientUserIds",
  is_shared as "isShared",
  active,
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

const DELIVERY_RUN_RETURN_COLUMNS = `
  id,
  organization_id as "organizationId",
  scheduled_delivery_id as "scheduledDeliveryId",
  report_run_id as "reportRunId",
  triggered_by as "triggeredBy",
  status,
  error_detail as "errorDetail",
  snapshot_summary as "snapshotSummary",
  started_at as "startedAt",
  completed_at as "completedAt",
  created_at as "createdAt"
`;

// ---------------------------------------------------------------------------
// ScheduledDelivery repository
// ---------------------------------------------------------------------------

export async function insertScheduledDelivery(
  db: Queryable,
  context: TenantContext,
  input: CreateScheduledDeliveryInput & { nextRunAt: string }
): Promise<ScheduledDelivery> {
  assertTenantContext(context);
  const result = await db.query<ScheduledDelivery>(
    `insert into scheduled_deliveries (
       organization_id, owner_user_id, name, target_type, target_id,
       cadence, timezone, next_run_at, channel, recipient_user_ids, is_shared, active
     ) values ($1, $2, $3, $4, $5, $6, $7, $8, 'in_app', $9::jsonb, $10, $11)
     returning ${SCHEDULED_DELIVERY_RETURN_COLUMNS}`,
    [
      context.organizationId,
      input.ownerUserId ?? null,
      input.name,
      input.targetType,
      input.targetId,
      input.cadence,
      input.timezone ?? "UTC",
      input.nextRunAt,
      JSON.stringify(input.recipientUserIds ?? []),
      input.isShared ?? false,
      input.active ?? true
    ]
  );
  return result.rows[0]!;
}

export async function findScheduledDeliveryById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<ScheduledDelivery | null> {
  assertTenantContext(context);
  const result = await db.query<ScheduledDelivery>(
    `select ${SCHEDULED_DELIVERY_RETURN_COLUMNS}
       from scheduled_deliveries
      where id = $1 and organization_id = $2 and deleted_at is null`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}

export async function listScheduledDeliveries(
  db: Queryable,
  context: TenantContext,
  options: {
    ownerUserId?: string | null;
    isShared?: boolean;
    active?: boolean;
    limit?: number;
    offset?: number;
  } = {}
): Promise<ScheduledDelivery[]> {
  assertTenantContext(context);
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const offset = Math.max(options.offset ?? 0, 0);
  const filterOwner = "ownerUserId" in options ? (options.ownerUserId ?? null) : undefined;
  const filterShared = "isShared" in options ? (options.isShared ?? null) : null;
  const filterActive = "active" in options ? (options.active ?? null) : null;

  const result = await db.query<ScheduledDelivery>(
    `select ${SCHEDULED_DELIVERY_RETURN_COLUMNS}
       from scheduled_deliveries
      where organization_id = $1
        and deleted_at is null
        and ($2::text is null or owner_user_id = $2::uuid)
        and ($3::boolean is null or is_shared = $3)
        and ($4::boolean is null or active = $4)
      order by name asc
      limit $5 offset $6`,
    [
      context.organizationId,
      filterOwner ?? null,
      filterShared,
      filterActive,
      limit,
      offset
    ]
  );
  return result.rows;
}

/** Returns active, non-deleted deliveries whose next_run_at <= asOf. */
export async function listDueScheduledDeliveries(
  db: Queryable,
  context: TenantContext,
  asOf: string
): Promise<ScheduledDelivery[]> {
  assertTenantContext(context);
  const result = await db.query<ScheduledDelivery>(
    `select ${SCHEDULED_DELIVERY_RETURN_COLUMNS}
       from scheduled_deliveries
      where organization_id = $1
        and deleted_at is null
        and active = true
        and next_run_at <= $2::timestamptz
      order by next_run_at asc, created_at asc`,
    [context.organizationId, asOf]
  );
  return result.rows;
}

export async function updateScheduledDeliveryRepo(
  db: Queryable,
  context: TenantContext,
  id: string,
  patch: UpdateScheduledDeliveryInput
): Promise<ScheduledDelivery | null> {
  assertTenantContext(context);
  const sets: string[] = ["updated_at = now()"];
  const values: unknown[] = [id, context.organizationId];

  const addSet = (sql: string, value: unknown) => {
    sets.push(`${sql} = $${values.length + 1}`);
    values.push(value);
  };

  if (patch.name !== undefined) addSet("name", patch.name);
  if (patch.cadence !== undefined) addSet("cadence", patch.cadence);
  if (patch.timezone !== undefined) addSet("timezone", patch.timezone);
  if (patch.recipientUserIds !== undefined) {
    sets.push(`recipient_user_ids = $${values.length + 1}::jsonb`);
    values.push(JSON.stringify(patch.recipientUserIds));
  }
  if (patch.isShared !== undefined) addSet("is_shared", patch.isShared);
  if (patch.active !== undefined) addSet("active", patch.active);
  if (patch.nextRunAt !== undefined) addSet("next_run_at", patch.nextRunAt);

  const result = await db.query<ScheduledDelivery>(
    `update scheduled_deliveries
        set ${sets.join(", ")}
      where id = $1 and organization_id = $2 and deleted_at is null
      returning ${SCHEDULED_DELIVERY_RETURN_COLUMNS}`,
    values
  );
  return result.rows[0] ?? null;
}

export async function softDeleteScheduledDelivery(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<{ id: string } | null> {
  assertTenantContext(context);
  const result = await db.query<{ id: string }>(
    `update scheduled_deliveries
        set deleted_at = now(), updated_at = now()
      where id = $1 and organization_id = $2 and deleted_at is null
      returning id`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}

/** Advance next_run_at to the given value and set last_run_at = now(). */
export async function advanceNextRunAt(
  db: Queryable,
  context: TenantContext,
  id: string,
  nextRunAt: string
): Promise<void> {
  assertTenantContext(context);
  await db.query(
    `update scheduled_deliveries
        set next_run_at = $3::timestamptz, last_run_at = now(), updated_at = now()
      where id = $1 and organization_id = $2 and deleted_at is null`,
    [id, context.organizationId, nextRunAt]
  );
}

/** Set last_run_at = now() without touching next_run_at (manual runs). */
export async function markLastRunAt(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<void> {
  assertTenantContext(context);
  await db.query(
    `update scheduled_deliveries
        set last_run_at = now(), updated_at = now()
      where id = $1 and organization_id = $2 and deleted_at is null`,
    [id, context.organizationId]
  );
}

// ---------------------------------------------------------------------------
// DeliveryRun repository
// ---------------------------------------------------------------------------

export async function insertDeliveryRun(
  db: Queryable,
  context: TenantContext,
  input: {
    scheduledDeliveryId: string;
    reportRunId: string | null;
    triggeredBy: "schedule" | "manual";
    status: "completed" | "failed" | "skipped";
    errorDetail: string | null;
    snapshotSummary: Record<string, unknown>;
    startedAt: string | null;
    completedAt: string | null;
  }
): Promise<DeliveryRun> {
  assertTenantContext(context);
  const result = await db.query<DeliveryRun>(
    `insert into delivery_runs (
       organization_id, scheduled_delivery_id, report_run_id, triggered_by,
       status, error_detail, snapshot_summary, started_at, completed_at
     ) values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
     returning ${DELIVERY_RUN_RETURN_COLUMNS}`,
    [
      context.organizationId,
      input.scheduledDeliveryId,
      input.reportRunId ?? null,
      input.triggeredBy,
      input.status,
      input.errorDetail ?? null,
      JSON.stringify(input.snapshotSummary),
      input.startedAt ?? null,
      input.completedAt ?? null
    ]
  );
  return result.rows[0]!;
}

export async function findDeliveryRunById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<DeliveryRun | null> {
  assertTenantContext(context);
  const result = await db.query<DeliveryRun>(
    `select ${DELIVERY_RUN_RETURN_COLUMNS}
       from delivery_runs
      where id = $1 and organization_id = $2`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}

export async function listDeliveryRunsByDelivery(
  db: Queryable,
  context: TenantContext,
  scheduledDeliveryId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<DeliveryRun[]> {
  assertTenantContext(context);
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const offset = Math.max(options.offset ?? 0, 0);

  const result = await db.query<DeliveryRun>(
    `select ${DELIVERY_RUN_RETURN_COLUMNS}
       from delivery_runs
      where organization_id = $1
        and scheduled_delivery_id = $2
      order by created_at desc
      limit $3 offset $4`,
    [context.organizationId, scheduledDeliveryId, limit, offset]
  );
  return result.rows;
}
