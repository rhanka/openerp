import type {
  ReportDefinition,
  ReportRun,
  CreateReportDefinitionInput,
  UpdateReportDefinitionInput
} from "@sentropic/openerp-domain/reporting";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";
import { recordAuditEvent } from "../foundation/audit-emit";
import { REPORT_CATALOG, validateReportParams } from "./report-registry";
import {
  findReportDefinitionById,
  insertReportDefinition,
  insertReportRun,
  listReportDefinitions as listReportDefinitionsRepo,
  listReportRuns as listReportRunsRepo,
  softDeleteReportDefinition,
  updateReportDefinitionRepo,
  findReportRunById as findReportRunByIdRepo
} from "./report-definitions";

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class ReportDefinitionNotFoundError extends Error {
  readonly code = "REPORT_DEFINITION_NOT_FOUND";
  constructor(id: string) {
    super(`ReportDefinition ${id} not found`);
  }
}

export class UnknownReportTypeError extends Error {
  readonly code = "UNKNOWN_REPORT_TYPE";
  constructor(reportType: string) {
    super(`Unknown report type: ${reportType}`);
  }
}

export class InvalidReportParamsError extends Error {
  readonly code = "INVALID_REPORT_PARAMS";
  constructor(message: string) {
    super(message);
  }
}

export class ReportRunFailedError extends Error {
  readonly code = "REPORT_RUN_FAILED";
  readonly runId: string;
  constructor(runId: string, message: string) {
    super(message);
    this.runId = runId;
  }
}

export class ForbiddenError extends Error {
  readonly code = "FORBIDDEN";
  constructor(message = "Access denied") {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function createReportDefinition(
  db: Queryable,
  context: TenantContext,
  input: CreateReportDefinitionInput
): Promise<ReportDefinition> {
  assertTenantContext(context);
  if (!REPORT_CATALOG[input.reportType]) {
    throw new UnknownReportTypeError(input.reportType);
  }
  const validation = validateReportParams(input.reportType, input.parameters ?? {});
  if (!validation.ok) {
    throw new InvalidReportParamsError(validation.error);
  }
  const created = await insertReportDefinition(db, context, input);
  await emitReportDefinitionAudit(db, context, {
    action: "reporting.report_definition.created",
    definitionId: created.id,
    beforeSummary: null,
    afterSummary: {
      name: created.name,
      reportType: created.reportType,
      ownerUserId: created.ownerUserId,
      isShared: created.isShared
    }
  });
  return created;
}

export async function updateReportDefinition(
  db: Queryable,
  context: TenantContext,
  id: string,
  patch: UpdateReportDefinitionInput
): Promise<ReportDefinition> {
  assertTenantContext(context);
  const before = await findReportDefinitionById(db, context, id);
  if (!before) throw new ReportDefinitionNotFoundError(id);
  enforceOwnership(before, context);
  if (patch.parameters !== undefined) {
    const validation = validateReportParams(before.reportType, patch.parameters);
    if (!validation.ok) throw new InvalidReportParamsError(validation.error);
  }
  const updated = await updateReportDefinitionRepo(db, context, id, patch);
  if (!updated) throw new ReportDefinitionNotFoundError(id);
  await emitReportDefinitionAudit(db, context, {
    action: "reporting.report_definition.updated",
    definitionId: updated.id,
    beforeSummary: {
      name: before.name,
      reportType: before.reportType,
      isShared: before.isShared
    },
    afterSummary: {
      name: updated.name,
      reportType: updated.reportType,
      isShared: updated.isShared
    }
  });
  return updated;
}

export async function deleteReportDefinition(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<void> {
  assertTenantContext(context);
  const before = await findReportDefinitionById(db, context, id);
  if (!before) throw new ReportDefinitionNotFoundError(id);
  enforceOwnership(before, context);
  const deleted = await softDeleteReportDefinition(db, context, id);
  if (!deleted) throw new ReportDefinitionNotFoundError(id);
  await emitReportDefinitionAudit(db, context, {
    action: "reporting.report_definition.deleted",
    definitionId: id,
    beforeSummary: { name: before.name, reportType: before.reportType },
    afterSummary: null
  });
}

export async function getReportDefinitionById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<ReportDefinition | null> {
  return findReportDefinitionById(db, context, id);
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
  return listReportDefinitionsRepo(db, context, options);
}

export async function runReportDefinition(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<ReportRun> {
  assertTenantContext(context);
  const def = await findReportDefinitionById(db, context, id);
  if (!def) throw new ReportDefinitionNotFoundError(id);

  const entry = REPORT_CATALOG[def.reportType];
  if (!entry) throw new UnknownReportTypeError(def.reportType);

  const parametersSnapshot = { ...def.parameters };
  const startedAt = new Date().toISOString();

  try {
    const rows = await entry.run(db, context.organizationId, def.parameters);
    const completedAt = new Date().toISOString();
    const run = await insertReportRun(db, context, {
      reportDefinitionId: def.id,
      triggeredByUserId: context.actorUserId,
      status: "completed",
      parametersSnapshot,
      resultColumns: entry.columns,
      resultRows: rows,
      rowCount: rows.length,
      errorDetail: null,
      startedAt,
      completedAt
    });
    await recordAuditEvent(db, context, {
      action: "reporting.report_run.completed",
      resourceType: "report_run",
      resourceId: run.id,
      afterSummary: {
        reportDefinitionId: def.id,
        reportType: def.reportType,
        rowCount: run.rowCount
      }
    });
    return run;
  } catch (err) {
    const completedAt = new Date().toISOString();
    const errorDetail = err instanceof Error ? err.message : String(err);
    let run: ReportRun;
    try {
      run = await insertReportRun(db, context, {
        reportDefinitionId: def.id,
        triggeredByUserId: context.actorUserId,
        status: "failed",
        parametersSnapshot,
        resultColumns: entry.columns,
        resultRows: [],
        rowCount: 0,
        errorDetail,
        startedAt,
        completedAt
      });
      await recordAuditEvent(db, context, {
        action: "reporting.report_run.failed",
        resourceType: "report_run",
        resourceId: run.id,
        afterSummary: {
          reportDefinitionId: def.id,
          reportType: def.reportType,
          errorDetail
        }
      });
      throw new ReportRunFailedError(run.id, errorDetail);
    } catch (innerErr) {
      if (innerErr instanceof ReportRunFailedError) throw innerErr;
      // If persisting the failure also fails, re-throw original
      throw new ReportRunFailedError("unknown", errorDetail);
    }
  }
}

export async function getReportRunById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<ReportRun | null> {
  return findReportRunByIdRepo(db, context, id);
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
  return listReportRunsRepo(db, context, options);
}

// ---------------------------------------------------------------------------
// Ownership enforcement
// A shared ReportDefinition may only be mutated by its owner.
// ---------------------------------------------------------------------------

function enforceOwnership(def: ReportDefinition, context: TenantContext): void {
  if (def.isShared && def.ownerUserId !== null && def.ownerUserId !== context.actorUserId) {
    throw new ForbiddenError(
      `Only the owner of shared ReportDefinition ${def.id} may modify it`
    );
  }
}

// ---------------------------------------------------------------------------
// Audit helpers
// ---------------------------------------------------------------------------

interface EmitAuditInput {
  action: string;
  definitionId: string;
  beforeSummary: Record<string, unknown> | null;
  afterSummary: Record<string, unknown> | null;
}

async function emitReportDefinitionAudit(
  db: Queryable,
  context: TenantContext,
  input: EmitAuditInput
): Promise<void> {
  await recordAuditEvent(db, context, {
    action: input.action,
    resourceType: "report_definition",
    resourceId: input.definitionId,
    beforeSummary: input.beforeSummary,
    afterSummary: input.afterSummary
  });
}
