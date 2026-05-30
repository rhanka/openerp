import { describe, expect, it } from "vitest";

import type { ReportDefinition, ReportRun } from "@sentropic/openerp-domain/reporting";
import type { Queryable } from "../../src/db/client";
import {
  ForbiddenError,
  InvalidReportParamsError,
  ReportDefinitionNotFoundError,
  ReportRunFailedError,
  UnknownReportTypeError,
  createReportDefinition,
  deleteReportDefinition,
  listReportDefinitions,
  runReportDefinition,
  updateReportDefinition
} from "../../src/reporting/report-definition-service";

interface AuditRow {
  organizationId: string;
  actorUserId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  beforeSummary: unknown;
  afterSummary: unknown;
}

function makeFakeDb(opts: { runThrows?: boolean } = {}) {
  const defs: ReportDefinition[] = [];
  const runs: ReportRun[] = [];
  const audits: AuditRow[] = [];
  // Fake pipeline_stages + opportunities query response for crm.pipeline_funnel
  let pipelineRows: Record<string, unknown>[] = [];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;

      // ------------------------------------------------------------------
      // report_definitions inserts
      // ------------------------------------------------------------------
      if (t.includes("insert into report_definitions")) {
        const [orgId, ownerUserId, reportType, name, parametersRaw, isShared] = values as [
          string, string | null, string, string, string, boolean
        ];
        const row: ReportDefinition = {
          id: `rd_${defs.length + 1}`,
          organizationId: orgId,
          ownerUserId,
          reportType,
          name,
          parameters: JSON.parse(parametersRaw as string) as Record<string, unknown>,
          isShared,
          createdAt: "2026-05-29T08:00:00.000Z",
          updatedAt: "2026-05-29T08:00:00.000Z"
        };
        defs.push(row);
        return { rows: [row as unknown as T] };
      }

      // ------------------------------------------------------------------
      // report_definitions findById
      // ------------------------------------------------------------------
      if (t.includes("from report_definitions") && t.includes("where id = $1")) {
        const [id, organizationId] = values as [string, string];
        const found = defs.find(
          (d) =>
            d.id === id &&
            d.organizationId === organizationId &&
            !(d as unknown as { _deleted?: boolean })._deleted
        );
        return { rows: found ? [found as unknown as T] : [] };
      }

      // ------------------------------------------------------------------
      // report_definitions list
      // ------------------------------------------------------------------
      if (t.includes("from report_definitions") && t.includes("order by name")) {
        const [organizationId, filterReportType, , , limit, offset] = values as [
          string, string | null, string | null, boolean | null, number, number
        ];
        const filtered = defs
          .filter((d) => d.organizationId === organizationId)
          .filter((d) => !(d as unknown as { _deleted?: boolean })._deleted)
          .filter((d) => filterReportType ? d.reportType === filterReportType : true)
          .sort((a, b) => a.name.localeCompare(b.name))
          .slice(offset, offset + limit);
        return { rows: filtered as unknown as T[] };
      }

      // ------------------------------------------------------------------
      // report_definitions soft-delete
      // ------------------------------------------------------------------
      if (t.includes("update report_definitions") && t.includes("deleted_at = now()")) {
        const [id, organizationId] = values as [string, string];
        const idx = defs.findIndex(
          (d) =>
            d.id === id &&
            d.organizationId === organizationId &&
            !(d as unknown as { _deleted?: boolean })._deleted
        );
        if (idx === -1) return { rows: [] };
        (defs[idx] as unknown as { _deleted: boolean })._deleted = true;
        return { rows: [{ id: defs[idx]!.id } as unknown as T] };
      }

      // ------------------------------------------------------------------
      // report_definitions update patch
      // ------------------------------------------------------------------
      if (t.includes("update report_definitions")) {
        const [id, organizationId] = values as [string, string];
        const idx = defs.findIndex(
          (d) =>
            d.id === id &&
            d.organizationId === organizationId &&
            !(d as unknown as { _deleted?: boolean })._deleted
        );
        if (idx === -1) return { rows: [] };
        const trailing = values.slice(2);
        const patch: Partial<ReportDefinition> = {};
        if (t.includes("name = $")) {
          const candidate = trailing.find(
            (v) => typeof v === "string" && !v.startsWith("{") && !v.startsWith("[")
          );
          if (candidate) patch.name = candidate as string;
        }
        if (t.includes("is_shared = $")) {
          const candidate = trailing.find((v) => typeof v === "boolean");
          if (candidate !== undefined) patch.isShared = candidate as boolean;
        }
        defs[idx] = { ...defs[idx]!, ...patch, updatedAt: "2026-05-29T08:05:00.000Z" };
        return { rows: [defs[idx]! as unknown as T] };
      }

      // ------------------------------------------------------------------
      // report_runs insert
      // ------------------------------------------------------------------
      if (t.includes("insert into report_runs")) {
        const [orgId, reportDefinitionId, triggeredByUserId, status, parametersSnapshotRaw,
          resultColumnsRaw, resultRowsRaw, rowCount, errorDetail, startedAt, completedAt] =
          values as [string, string, string | null, string, string, string, string, number, string | null, string | null, string | null];
        const row: ReportRun = {
          id: `rr_${runs.length + 1}`,
          organizationId: orgId,
          reportDefinitionId,
          triggeredByUserId,
          status: status as "completed" | "failed",
          parametersSnapshot: JSON.parse(parametersSnapshotRaw as string) as Record<string, unknown>,
          resultColumns: JSON.parse(resultColumnsRaw as string) as ReportRun["resultColumns"],
          resultRows: JSON.parse(resultRowsRaw as string) as Record<string, unknown>[],
          rowCount,
          errorDetail: errorDetail ?? null,
          startedAt: startedAt ?? null,
          completedAt: completedAt ?? null,
          createdAt: "2026-05-29T08:00:00.000Z"
        };
        runs.push(row);
        return { rows: [row as unknown as T] };
      }

      // ------------------------------------------------------------------
      // audit_events insert — positional shape from audit-emit.ts
      // ------------------------------------------------------------------
      if (t.includes("insert into audit_events")) {
        const [
          organizationId,
          actorUserId,
          _actorType,
          action,
          resourceType,
          resourceId,
          beforeSummary,
          afterSummary
        ] = values as [string, string, string, string, string, string, unknown, unknown];
        void _actorType;
        audits.push({
          organizationId,
          actorUserId,
          action,
          resourceType,
          resourceId,
          beforeSummary,
          afterSummary
        });
        return { rows: [] };
      }

      // ------------------------------------------------------------------
      // crm.pipeline_funnel actual query (via run())
      // ------------------------------------------------------------------
      if (t.includes("from pipeline_stages")) {
        if (opts.runThrows) throw new Error("DB query failed");
        return { rows: pipelineRows as unknown as T[] };
      }

      return { rows: [] };
    }
  };

  return { db, defs, runs, audits, setPipelineRows: (rows: Record<string, unknown>[]) => { pipelineRows = rows; } };
}

const context = { organizationId: "org_1", actorUserId: "user_actor" };
const contextB = { organizationId: "org_1", actorUserId: "user_other" };

describe("ReportDefinitionService (DS 5.1)", () => {
  it("creates a definition and emits reporting.report_definition.created", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createReportDefinition(db, context, {
      reportType: "crm.pipeline_funnel",
      name: "Pipeline funnel Q1"
    });
    expect(created.reportType).toBe("crm.pipeline_funnel");
    expect(created.name).toBe("Pipeline funnel Q1");
    expect(audits).toHaveLength(1);
    expect(audits[0]!.action).toBe("reporting.report_definition.created");
    expect(audits[0]!.resourceId).toBe(created.id);
    expect(audits[0]!.afterSummary).toMatchObject({ name: "Pipeline funnel Q1" });
  });

  it("throws UnknownReportTypeError for unknown reportType", async () => {
    const { db } = makeFakeDb();
    await expect(
      createReportDefinition(db, context, { reportType: "unknown.type", name: "X" })
    ).rejects.toBeInstanceOf(UnknownReportTypeError);
  });

  it("throws InvalidReportParamsError when required param missing", async () => {
    const { db } = makeFakeDb();
    await expect(
      createReportDefinition(db, context, {
        reportType: "project.time_by_user",
        name: "Time by user",
        parameters: { periodEnd: "2026-03-31" }
      })
    ).rejects.toBeInstanceOf(InvalidReportParamsError);
  });

  it("updates a definition and emits reporting.report_definition.updated with before/after", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createReportDefinition(db, context, {
      reportType: "crm.pipeline_funnel",
      name: "Pipeline funnel"
    });
    const updated = await updateReportDefinition(db, context, created.id, { name: "Updated funnel" });
    expect(updated.name).toBe("Updated funnel");
    const updateAudit = audits.find((a) => a.action === "reporting.report_definition.updated");
    expect(updateAudit).toBeDefined();
    expect(updateAudit!.beforeSummary).toMatchObject({ name: "Pipeline funnel" });
    expect(updateAudit!.afterSummary).toMatchObject({ name: "Updated funnel" });
  });

  it("throws ReportDefinitionNotFoundError on update of missing id", async () => {
    const { db } = makeFakeDb();
    await expect(
      updateReportDefinition(db, context, "rd_nope", { name: "X" })
    ).rejects.toBeInstanceOf(ReportDefinitionNotFoundError);
  });

  it("soft-deletes and emits reporting.report_definition.deleted", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createReportDefinition(db, context, {
      reportType: "crm.pipeline_funnel",
      name: "ToDelete"
    });
    await deleteReportDefinition(db, context, created.id);
    const deleteAudit = audits.find((a) => a.action === "reporting.report_definition.deleted");
    expect(deleteAudit).toBeDefined();
    expect(deleteAudit!.resourceId).toBe(created.id);
    expect(deleteAudit!.beforeSummary).toMatchObject({ name: "ToDelete" });
    const list = await listReportDefinitions(db, context);
    expect(list.find((d) => d.id === created.id)).toBeUndefined();
  });

  it("run() success persists completed run and emits reporting.report_run.completed", async () => {
    const { db, runs, audits, setPipelineRows } = makeFakeDb();
    setPipelineRows([{ stage: "Discovery", open_count: "3", pipeline_value_minor: "5000" }]);
    const created = await createReportDefinition(db, context, {
      reportType: "crm.pipeline_funnel",
      name: "Funnel"
    });
    const run = await runReportDefinition(db, context, created.id);
    expect(run.status).toBe("completed");
    expect(run.rowCount).toBe(1);
    expect(run.resultColumns.length).toBeGreaterThan(0);
    expect(runs).toHaveLength(1);
    const completedAudit = audits.find((a) => a.action === "reporting.report_run.completed");
    expect(completedAudit).toBeDefined();
    expect(completedAudit!.resourceId).toBe(run.id);
  });

  it("run() failure persists failed run, emits reporting.report_run.failed, and rethrows", async () => {
    const { db, runs, audits } = makeFakeDb({ runThrows: true });
    const created = await createReportDefinition(db, context, {
      reportType: "crm.pipeline_funnel",
      name: "Funnel fail"
    });
    await expect(runReportDefinition(db, context, created.id)).rejects.toBeInstanceOf(
      ReportRunFailedError
    );
    const failedRun = runs.find((r) => r.status === "failed");
    expect(failedRun).toBeDefined();
    const failedAudit = audits.find((a) => a.action === "reporting.report_run.failed");
    expect(failedAudit).toBeDefined();
  });

  it("ownership enforcement: shared definition non-owner update throws ForbiddenError", async () => {
    const { db } = makeFakeDb();
    // Create as user_actor (the owner), shared=true
    const created = await createReportDefinition(db, context, {
      reportType: "crm.pipeline_funnel",
      name: "Shared funnel",
      isShared: true,
      ownerUserId: "user_actor"
    });
    // Try to update as user_other
    await expect(
      updateReportDefinition(db, contextB, created.id, { name: "Hacked" })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("ownership enforcement: shared definition non-owner delete throws ForbiddenError", async () => {
    const { db } = makeFakeDb();
    const created = await createReportDefinition(db, context, {
      reportType: "crm.pipeline_funnel",
      name: "Shared funnel",
      isShared: true,
      ownerUserId: "user_actor"
    });
    await expect(
      deleteReportDefinition(db, contextB, created.id)
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
