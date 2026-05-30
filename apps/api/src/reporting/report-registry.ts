import type { ReportColumn } from "@sentropic/openerp-domain/reporting";
import type { Queryable } from "../db/client";

// Server-side catalog of available report types (DS 5.1 Archetype A).
// Each entry defines: parameter schema, column definitions, and an async run
// function that executes the underlying SQL with tenant isolation.
//
// IMPORTANT: every run() binds organization_id=$1 as the first positional param
// (belt-and-suspenders on top of RLS set_config).

export interface ReportCatalogParam {
  key: string;
  type: "string" | "uuid" | "date";
  required: boolean;
}

export interface ReportCatalogEntry {
  paramsSchema: ReportCatalogParam[];
  columns: ReportColumn[];
  run(
    db: Queryable,
    organizationId: string,
    params: Record<string, unknown>
  ): Promise<Record<string, unknown>[]>;
}

export const REPORT_CATALOG: Record<string, ReportCatalogEntry> = {
  "crm.pipeline_funnel": {
    paramsSchema: [],
    columns: [
      { key: "stage", labelKey: "reporting.reportTypes.crm_pipeline_funnel.col.stage", dataType: "string" },
      { key: "open_count", labelKey: "reporting.reportTypes.crm_pipeline_funnel.col.open_count", dataType: "number" },
      { key: "pipeline_value_minor", labelKey: "reporting.reportTypes.crm_pipeline_funnel.col.pipeline_value_minor", dataType: "money" }
    ],
    async run(db, organizationId, _params) {
      const result = await db.query<Record<string, unknown>>(
        `select ps.name as stage,
                ps.order_index,
                count(o.id) filter (where o.status = 'open') as open_count,
                coalesce(sum((o.expected_value->>'amountMinor')::numeric) filter (where o.status = 'open'), 0)::text as pipeline_value_minor
           from pipeline_stages ps
           left join opportunities o
             on o.stage_id = ps.id
            and o.deleted_at is null
            and o.organization_id = $1
          where ps.organization_id = $1
          group by ps.id, ps.name, ps.order_index
          order by ps.order_index`,
        [organizationId]
      );
      return result.rows;
    }
  },

  "billing.outstanding_invoices": {
    paramsSchema: [
      { key: "companyId", type: "uuid", required: false }
    ],
    columns: [
      { key: "invoice_number", labelKey: "reporting.reportTypes.billing_outstanding_invoices.col.invoice_number", dataType: "string" },
      { key: "total_minor", labelKey: "reporting.reportTypes.billing_outstanding_invoices.col.total_minor", dataType: "money" },
      { key: "currency", labelKey: "reporting.reportTypes.billing_outstanding_invoices.col.currency", dataType: "string" },
      { key: "due_date", labelKey: "reporting.reportTypes.billing_outstanding_invoices.col.due_date", dataType: "date" },
      { key: "status", labelKey: "reporting.reportTypes.billing_outstanding_invoices.col.status", dataType: "string" }
    ],
    async run(db, organizationId, params) {
      const companyId = params.companyId as string | undefined;
      if (companyId) {
        const result = await db.query<Record<string, unknown>>(
          `select invoice_number,
                  company_id,
                  (total->>'amountMinor')::numeric::text as total_minor,
                  (total->>'currency') as currency,
                  due_date,
                  status
             from invoices
            where organization_id = $1
              and deleted_at is null
              and status in ('issued', 'partially_paid')
              and company_id = $2
            order by due_date asc`,
          [organizationId, companyId]
        );
        return result.rows;
      }
      const result = await db.query<Record<string, unknown>>(
        `select invoice_number,
                company_id,
                (total->>'amountMinor')::numeric::text as total_minor,
                (total->>'currency') as currency,
                due_date,
                status
           from invoices
          where organization_id = $1
            and deleted_at is null
            and status in ('issued', 'partially_paid')
          order by due_date asc`,
        [organizationId]
      );
      return result.rows;
    }
  },

  "project.time_by_user": {
    paramsSchema: [
      { key: "periodStart", type: "date", required: true },
      { key: "periodEnd", type: "date", required: true },
      { key: "projectId", type: "uuid", required: false }
    ],
    columns: [
      { key: "user_id", labelKey: "reporting.reportTypes.project_time_by_user.col.user_id", dataType: "string" },
      { key: "billable", labelKey: "reporting.reportTypes.project_time_by_user.col.billable", dataType: "string" },
      { key: "total_minutes", labelKey: "reporting.reportTypes.project_time_by_user.col.total_minutes", dataType: "number" }
    ],
    async run(db, organizationId, params) {
      const periodStart = params.periodStart as string;
      const periodEnd = params.periodEnd as string;
      const projectId = params.projectId as string | undefined;
      if (projectId) {
        const result = await db.query<Record<string, unknown>>(
          `select user_id,
                  billable::text,
                  sum(minutes)::text as total_minutes
             from time_entries
            where organization_id = $1
              and deleted_at is null
              and status = 'approved'
              and entry_date between $2 and $3
              and project_id = $4
            group by user_id, billable
            order by user_id`,
          [organizationId, periodStart, periodEnd, projectId]
        );
        return result.rows;
      }
      const result = await db.query<Record<string, unknown>>(
        `select user_id,
                billable::text,
                sum(minutes)::text as total_minutes
           from time_entries
          where organization_id = $1
            and deleted_at is null
            and status = 'approved'
            and entry_date between $2 and $3
          group by user_id, billable
          order by user_id`,
        [organizationId, periodStart, periodEnd]
      );
      return result.rows;
    }
  },

  "billing.revenue_by_period": {
    paramsSchema: [
      { key: "periodStart", type: "date", required: true },
      { key: "periodEnd", type: "date", required: true },
      { key: "currency", type: "string", required: false }
    ],
    columns: [
      { key: "period", labelKey: "reporting.reportTypes.billing_revenue_by_period.col.period", dataType: "string" },
      { key: "currency", labelKey: "reporting.reportTypes.billing_revenue_by_period.col.currency", dataType: "string" },
      { key: "revenue_minor", labelKey: "reporting.reportTypes.billing_revenue_by_period.col.revenue_minor", dataType: "money" }
    ],
    async run(db, organizationId, params) {
      const periodStart = params.periodStart as string;
      const periodEnd = params.periodEnd as string;
      const currency = params.currency as string | undefined;
      if (currency) {
        const result = await db.query<Record<string, unknown>>(
          `select to_char(date_trunc('month', issue_date), 'YYYY-MM') as period,
                  (total->>'currency') as currency,
                  coalesce(sum((total->>'amountMinor')::numeric), 0)::text as revenue_minor
             from invoices
            where organization_id = $1
              and deleted_at is null
              and status in ('issued', 'paid', 'partially_paid')
              and issue_date between $2 and $3
              and (total->>'currency') = $4
            group by 1, 2
            order by 1`,
          [organizationId, periodStart, periodEnd, currency]
        );
        return result.rows;
      }
      const result = await db.query<Record<string, unknown>>(
        `select to_char(date_trunc('month', issue_date), 'YYYY-MM') as period,
                (total->>'currency') as currency,
                coalesce(sum((total->>'amountMinor')::numeric), 0)::text as revenue_minor
           from invoices
          where organization_id = $1
            and deleted_at is null
            and status in ('issued', 'paid', 'partially_paid')
            and issue_date between $2 and $3
          group by 1, 2
          order by 1`,
        [organizationId, periodStart, periodEnd]
      );
      return result.rows;
    }
  }
};

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

export function validateReportParams(
  reportType: string,
  params: Record<string, unknown>
): { ok: true } | { ok: false; error: string } {
  const entry = REPORT_CATALOG[reportType];
  if (!entry) {
    return { ok: false, error: `Unknown report type: ${reportType}` };
  }
  for (const p of entry.paramsSchema) {
    if (p.required && (params[p.key] === undefined || params[p.key] === null || params[p.key] === "")) {
      return { ok: false, error: `Missing required parameter: ${p.key}` };
    }
  }
  return { ok: true };
}

export function getCatalogMetadata(): Array<{
  reportType: string;
  labelKey: string;
  params: ReportCatalogParam[];
  columns: ReportColumn[];
}> {
  return Object.entries(REPORT_CATALOG).map(([reportType, entry]) => ({
    reportType,
    labelKey: `reporting.reportTypes.${reportType.replace(".", "_")}.label`,
    params: entry.paramsSchema,
    columns: entry.columns
  }));
}
