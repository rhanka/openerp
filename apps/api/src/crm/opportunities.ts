import type {
  CreateOpportunityInput,
  Opportunity,
  OpportunityStatus,
  UpdateOpportunityInput
} from "@sentropic/openerp-domain/crm";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";

const OPPORTUNITY_RETURN_COLUMNS = `
  id,
  organization_id as "organizationId",
  company_id as "companyId",
  primary_contact_id as "primaryContactId",
  name,
  stage_id as "stageId",
  status,
  owner_user_id as "ownerUserId",
  team_id as "teamId",
  expected_value as "expectedValue",
  currency,
  expected_close_date as "expectedCloseDate",
  probability_band as "probabilityBand",
  service_summary as "serviceSummary",
  loss_reason as "lossReason",
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

export async function insertOpportunity(
  db: Queryable,
  context: TenantContext,
  input: CreateOpportunityInput
): Promise<Opportunity> {
  assertTenantContext(context);
  const result = await db.query<Opportunity>(
    `insert into opportunities (
       organization_id, company_id, primary_contact_id, name, stage_id, status,
       owner_user_id, team_id, expected_value, currency, expected_close_date,
       probability_band, service_summary
     ) values ($1, $2, $3, $4, $5, 'open', $6, $7, $8, $9, $10, $11, $12)
     returning ${OPPORTUNITY_RETURN_COLUMNS}`,
    [
      context.organizationId,
      input.companyId,
      input.primaryContactId ?? null,
      input.name,
      input.stageId,
      input.ownerUserId ?? null,
      input.teamId ?? null,
      input.expectedValue ?? null,
      input.currency ?? null,
      input.expectedCloseDate ?? null,
      input.probabilityBand ?? null,
      input.serviceSummary ?? null
    ]
  );
  return result.rows[0]!;
}

export async function findOpportunityById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<Opportunity | null> {
  assertTenantContext(context);
  const result = await db.query<Opportunity>(
    `select ${OPPORTUNITY_RETURN_COLUMNS}
       from opportunities
      where id = $1 and organization_id = $2`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}

export async function listOpportunities(
  db: Queryable,
  context: TenantContext,
  options: {
    limit?: number;
    offset?: number;
    status?: OpportunityStatus;
    companyId?: string | null;
    stageId?: string | null;
  } = {}
): Promise<Opportunity[]> {
  assertTenantContext(context);
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const offset = Math.max(options.offset ?? 0, 0);
  const filterStatus = options.status ?? null;
  const filterCompanyId = options.companyId ?? null;
  const filterStageId = options.stageId ?? null;
  const result = await db.query<Opportunity>(
    `select ${OPPORTUNITY_RETURN_COLUMNS}
       from opportunities
      where organization_id = $1
        and ($2::text is null or status = $2)
        and ($3::uuid is null or company_id = $3)
        and ($4::uuid is null or stage_id = $4)
      order by created_at desc
      limit $5 offset $6`,
    [context.organizationId, filterStatus, filterCompanyId, filterStageId, limit, offset]
  );
  return result.rows;
}

export async function updateOpportunity(
  db: Queryable,
  context: TenantContext,
  id: string,
  patch: UpdateOpportunityInput
): Promise<Opportunity | null> {
  assertTenantContext(context);
  const sets: string[] = ["updated_at = now()"];
  const values: unknown[] = [id, context.organizationId];
  let i = values.length;
  const setColumn = (column: string, value: unknown) => {
    i += 1;
    sets.push(`${column} = $${i}`);
    values.push(value);
  };
  if (patch.primaryContactId !== undefined) setColumn("primary_contact_id", patch.primaryContactId);
  if (patch.name !== undefined) setColumn("name", patch.name);
  if (patch.stageId !== undefined) setColumn("stage_id", patch.stageId);
  if (patch.status !== undefined) setColumn("status", patch.status);
  if (patch.ownerUserId !== undefined) setColumn("owner_user_id", patch.ownerUserId);
  if (patch.teamId !== undefined) setColumn("team_id", patch.teamId);
  if (patch.expectedValue !== undefined) setColumn("expected_value", patch.expectedValue);
  if (patch.currency !== undefined) setColumn("currency", patch.currency);
  if (patch.expectedCloseDate !== undefined) setColumn("expected_close_date", patch.expectedCloseDate);
  if (patch.probabilityBand !== undefined) setColumn("probability_band", patch.probabilityBand);
  if (patch.serviceSummary !== undefined) setColumn("service_summary", patch.serviceSummary);
  if (patch.lossReason !== undefined) setColumn("loss_reason", patch.lossReason);

  const result = await db.query<Opportunity>(
    `update opportunities
        set ${sets.join(", ")}
      where id = $1 and organization_id = $2
      returning ${OPPORTUNITY_RETURN_COLUMNS}`,
    values
  );
  return result.rows[0] ?? null;
}
