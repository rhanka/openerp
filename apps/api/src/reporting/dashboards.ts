import type {
  Dashboard,
  DashboardWidget,
  CreateDashboardInput,
  UpdateDashboardInput,
  CreateDashboardWidgetInput,
  UpdateDashboardWidgetInput
} from "@sentropic/openerp-domain/reporting";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";

// Repository for Dashboard and DashboardWidget entities (DS 5.2).

const DASHBOARD_RETURN_COLUMNS = `
  id,
  organization_id as "organizationId",
  owner_user_id as "ownerUserId",
  name,
  description,
  is_shared as "isShared",
  to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt",
  to_char(updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "updatedAt"
`;

const DASHBOARD_WIDGET_RETURN_COLUMNS = `
  id,
  organization_id as "organizationId",
  dashboard_id as "dashboardId",
  report_definition_id as "reportDefinitionId",
  title,
  position,
  to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt",
  to_char(updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "updatedAt"
`;

// ---------------------------------------------------------------------------
// Dashboard repository
// ---------------------------------------------------------------------------

export async function insertDashboard(
  db: Queryable,
  context: TenantContext,
  input: CreateDashboardInput
): Promise<Dashboard> {
  assertTenantContext(context);
  const result = await db.query<Dashboard>(
    `insert into dashboards (
       organization_id, owner_user_id, name, description, is_shared
     ) values ($1, $2, $3, $4, $5)
     returning ${DASHBOARD_RETURN_COLUMNS}`,
    [
      context.organizationId,
      input.ownerUserId ?? null,
      input.name,
      input.description ?? null,
      input.isShared ?? false
    ]
  );
  return result.rows[0]!;
}

export async function findDashboardById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<Dashboard | null> {
  assertTenantContext(context);
  const result = await db.query<Dashboard>(
    `select ${DASHBOARD_RETURN_COLUMNS}
       from dashboards
      where id = $1 and organization_id = $2 and deleted_at is null`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}

export async function listDashboards(
  db: Queryable,
  context: TenantContext,
  options: {
    limit?: number;
    offset?: number;
    ownerUserId?: string | null;
    isShared?: boolean;
  } = {}
): Promise<Dashboard[]> {
  assertTenantContext(context);
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const offset = Math.max(options.offset ?? 0, 0);
  const filterOwnerUserId = "ownerUserId" in options ? (options.ownerUserId ?? null) : undefined;
  const filterShared = "isShared" in options ? (options.isShared ?? null) : null;

  const result = await db.query<Dashboard>(
    `select ${DASHBOARD_RETURN_COLUMNS}
       from dashboards
      where organization_id = $1
        and ($2::text is null or owner_user_id = $2::uuid)
        and ($3::boolean is null or is_shared = $3)
        and deleted_at is null
      order by name asc
      limit $4 offset $5`,
    [
      context.organizationId,
      filterOwnerUserId ?? null,
      filterShared,
      limit,
      offset
    ]
  );
  return result.rows;
}

export async function updateDashboardRepo(
  db: Queryable,
  context: TenantContext,
  id: string,
  patch: UpdateDashboardInput
): Promise<Dashboard | null> {
  assertTenantContext(context);
  const sets: string[] = ["updated_at = now()"];
  const values: unknown[] = [id, context.organizationId];
  let i = values.length;
  const setColumn = (column: string, value: unknown) => {
    i += 1;
    sets.push(`${column} = $${i}`);
    values.push(value);
  };
  if (patch.name !== undefined) setColumn("name", patch.name);
  if (patch.description !== undefined) setColumn("description", patch.description);
  if (patch.isShared !== undefined) setColumn("is_shared", patch.isShared);

  const result = await db.query<Dashboard>(
    `update dashboards
        set ${sets.join(", ")}
      where id = $1 and organization_id = $2 and deleted_at is null
      returning ${DASHBOARD_RETURN_COLUMNS}`,
    values
  );
  return result.rows[0] ?? null;
}

export async function softDeleteDashboard(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<{ id: string } | null> {
  assertTenantContext(context);
  const result = await db.query<{ id: string }>(
    `update dashboards
        set deleted_at = now(), updated_at = now()
      where id = $1 and organization_id = $2 and deleted_at is null
      returning id`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// DashboardWidget repository
// ---------------------------------------------------------------------------

export async function insertDashboardWidget(
  db: Queryable,
  context: TenantContext,
  dashboardId: string,
  input: CreateDashboardWidgetInput
): Promise<DashboardWidget> {
  assertTenantContext(context);
  const result = await db.query<DashboardWidget>(
    `insert into dashboard_widgets (
       organization_id, dashboard_id, report_definition_id, title, position
     ) values ($1, $2, $3, $4, $5)
     returning ${DASHBOARD_WIDGET_RETURN_COLUMNS}`,
    [
      context.organizationId,
      dashboardId,
      input.reportDefinitionId,
      input.title ?? null,
      input.position ?? 0
    ]
  );
  return result.rows[0]!;
}

export async function findDashboardWidgetById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<DashboardWidget | null> {
  assertTenantContext(context);
  const result = await db.query<DashboardWidget>(
    `select ${DASHBOARD_WIDGET_RETURN_COLUMNS}
       from dashboard_widgets
      where id = $1 and organization_id = $2 and deleted_at is null`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}

export async function listDashboardWidgets(
  db: Queryable,
  context: TenantContext,
  dashboardId: string
): Promise<DashboardWidget[]> {
  assertTenantContext(context);
  const result = await db.query<DashboardWidget>(
    `select ${DASHBOARD_WIDGET_RETURN_COLUMNS}
       from dashboard_widgets
      where organization_id = $1 and dashboard_id = $2 and deleted_at is null
      order by position asc, created_at asc`,
    [context.organizationId, dashboardId]
  );
  return result.rows;
}

export async function updateDashboardWidgetRepo(
  db: Queryable,
  context: TenantContext,
  id: string,
  patch: UpdateDashboardWidgetInput
): Promise<DashboardWidget | null> {
  assertTenantContext(context);
  const sets: string[] = ["updated_at = now()"];
  const values: unknown[] = [id, context.organizationId];
  let i = values.length;
  const setColumn = (column: string, value: unknown) => {
    i += 1;
    sets.push(`${column} = $${i}`);
    values.push(value);
  };
  if (patch.title !== undefined) setColumn("title", patch.title);
  if (patch.position !== undefined) setColumn("position", patch.position);

  const result = await db.query<DashboardWidget>(
    `update dashboard_widgets
        set ${sets.join(", ")}
      where id = $1 and organization_id = $2 and deleted_at is null
      returning ${DASHBOARD_WIDGET_RETURN_COLUMNS}`,
    values
  );
  return result.rows[0] ?? null;
}

export async function softDeleteDashboardWidget(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<{ id: string } | null> {
  assertTenantContext(context);
  const result = await db.query<{ id: string }>(
    `update dashboard_widgets
        set deleted_at = now(), updated_at = now()
      where id = $1 and organization_id = $2 and deleted_at is null
      returning id`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}
