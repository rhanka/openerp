import type {
  ReportDefinition,
  ReportRun,
  CreateReportDefinitionInput,
  UpdateReportDefinitionInput,
  ReportColumn
} from "@sentropic/openerp-domain/reporting";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";

// Repository for ReportDefinition and ReportRun entities.

const REPORT_DEFINITION_RETURN_COLUMNS = `
  id,
  organization_id as "organizationId",
  owner_user_id as "ownerUserId",
  report_type as "reportType",
  name,
  parameters,
  is_shared as "isShared",
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

const REPORT_RUN_RETURN_COLUMNS = `
  id,
  organization_id as "organizationId",
  report_definition_id as "reportDefinitionId",
  triggered_by_user_id as "triggeredByUserId",
  status,
  parameters_snapshot as "parametersSnapshot",
  result_columns as "resultColumns",
  result_rows as "resultRows",
  row_count as "rowCount",
  error_detail as "errorDetail",
  started_at as "startedAt",
  completed_at as "completedAt",
  created_at as "createdAt"
`;

// ---------------------------------------------------------------------------
// ReportDefinition repository
// ---------------------------------------------------------------------------

export async function insertReportDefinition(
  db: Queryable,
  context: TenantContext,
  input: CreateReportDefinitionInput
): Promise<ReportDefinition> {
  assertTenantContext(context);
  const result = await db.query<ReportDefinition>(
    `insert into report_definitions (
       organization_id, owner_user_id, report_type, name, parameters, is_shared
     ) values ($1, $2, $3, $4, $5, $6)
     returning ${REPORT_DEFINITION_RETURN_COLUMNS}`,
    [
      context.organizationId,
      input.ownerUserId ?? null,
      input.reportType,
      input.name,
      JSON.stringify(input.parameters ?? {}),
      input.isShared ?? false
    ]
  );
  return result.rows[0]!;
}

export async function findReportDefinitionById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<ReportDefinition | null> {
  assertTenantContext(context);
  const result = await db.query<ReportDefinition>(
    `select ${REPORT_DEFINITION_RETURN_COLUMNS}
       from report_definitions
      where id = $1 and organization_id = $2 and deleted_at is null`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}

export async function listReportDefinitions(
  db: Queryable,
  context: TenantContext,
  options: {
    limit?: number;
    offset?: number;
    reportType?: string;
    ownerUserId?: string | null;
    isShared?: boolean;
  } = {}
): Promise<ReportDefinition[]> {
  assertTenantContext(context);
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const offset = Math.max(options.offset ?? 0, 0);
  const filterReportType = options.reportType ?? null;
  const filterOwnerUserId = "ownerUserId" in options ? (options.ownerUserId ?? null) : undefined;
  const filterShared = "isShared" in options ? (options.isShared ?? null) : null;

  const result = await db.query<ReportDefinition>(
    `select ${REPORT_DEFINITION_RETURN_COLUMNS}
       from report_definitions
      where organization_id = $1
        and ($2::text is null or report_type = $2)
        and ($3::text is null or owner_user_id = $3::uuid)
        and ($4::boolean is null or is_shared = $4)
        and deleted_at is null
      order by name asc
      limit $5 offset $6`,
    [
      context.organizationId,
      filterReportType,
      filterOwnerUserId ?? null,
      filterShared,
      limit,
      offset
    ]
  );
  return result.rows;
}

export async function updateReportDefinitionRepo(
  db: Queryable,
  context: TenantContext,
  id: string,
  patch: UpdateReportDefinitionInput
): Promise<ReportDefinition | null> {
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
  if (patch.parameters !== undefined) setColumn("parameters", JSON.stringify(patch.parameters));
  if (patch.isShared !== undefined) setColumn("is_shared", patch.isShared);

  const result = await db.query<ReportDefinition>(
    `update report_definitions
        set ${sets.join(", ")}
      where id = $1 and organization_id = $2 and deleted_at is null
      returning ${REPORT_DEFINITION_RETURN_COLUMNS}`,
    values
  );
  return result.rows[0] ?? null;
}

export async function softDeleteReportDefinition(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<{ id: string } | null> {
  assertTenantContext(context);
  const result = await db.query<{ id: string }>(
    `update report_definitions
        set deleted_at = now(), updated_at = now()
      where id = $1 and organization_id = $2 and deleted_at is null
      returning id`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// ReportRun repository
// ---------------------------------------------------------------------------

export async function insertReportRun(
  db: Queryable,
  context: TenantContext,
  input: {
    reportDefinitionId: string;
    triggeredByUserId: string | null;
    status: "completed" | "failed";
    parametersSnapshot: Record<string, unknown>;
    resultColumns: ReportColumn[];
    resultRows: Record<string, unknown>[];
    rowCount: number;
    errorDetail: string | null;
    startedAt: string | null;
    completedAt: string | null;
  }
): Promise<ReportRun> {
  assertTenantContext(context);
  const result = await db.query<ReportRun>(
    `insert into report_runs (
       organization_id, report_definition_id, triggered_by_user_id, status,
       parameters_snapshot, result_columns, result_rows, row_count,
       error_detail, started_at, completed_at
     ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     returning ${REPORT_RUN_RETURN_COLUMNS}`,
    [
      context.organizationId,
      input.reportDefinitionId,
      input.triggeredByUserId ?? null,
      input.status,
      JSON.stringify(input.parametersSnapshot),
      JSON.stringify(input.resultColumns),
      JSON.stringify(input.resultRows),
      input.rowCount,
      input.errorDetail ?? null,
      input.startedAt ?? null,
      input.completedAt ?? null
    ]
  );
  return result.rows[0]!;
}

export async function findReportRunById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<ReportRun | null> {
  assertTenantContext(context);
  const result = await db.query<ReportRun>(
    `select ${REPORT_RUN_RETURN_COLUMNS}
       from report_runs
      where id = $1 and organization_id = $2`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}

export async function listReportRuns(
  db: Queryable,
  context: TenantContext,
  options: {
    limit?: number;
    offset?: number;
    reportDefinitionId?: string;
  } = {}
): Promise<ReportRun[]> {
  assertTenantContext(context);
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const offset = Math.max(options.offset ?? 0, 0);
  const filterDefId = options.reportDefinitionId ?? null;

  const result = await db.query<ReportRun>(
    `select ${REPORT_RUN_RETURN_COLUMNS}
       from report_runs
      where organization_id = $1
        and ($2::text is null or report_definition_id = $2::uuid)
      order by created_at desc
      limit $3 offset $4`,
    [context.organizationId, filterDefId, limit, offset]
  );
  return result.rows;
}
