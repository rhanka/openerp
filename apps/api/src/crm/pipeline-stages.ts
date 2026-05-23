import type {
  CreatePipelineStageInput,
  PipelineStage,
  UpdatePipelineStageInput
} from "@sentropic/openerp-domain/crm";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";

const STAGE_RETURN_COLUMNS = `
  id,
  organization_id as "organizationId",
  name,
  order_index as "orderIndex",
  is_initial as "isInitial",
  is_won as "isWon",
  is_lost as "isLost",
  active,
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

export async function insertPipelineStage(
  db: Queryable,
  context: TenantContext,
  input: CreatePipelineStageInput
): Promise<PipelineStage> {
  assertTenantContext(context);
  const result = await db.query<PipelineStage>(
    `insert into pipeline_stages (
       organization_id, name, order_index, is_initial, is_won, is_lost, active
     ) values ($1, $2, $3, $4, $5, $6, true)
     returning ${STAGE_RETURN_COLUMNS}`,
    [
      context.organizationId,
      input.name,
      input.orderIndex,
      input.isInitial ?? false,
      input.isWon ?? false,
      input.isLost ?? false
    ]
  );
  return result.rows[0]!;
}

export async function findPipelineStageById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<PipelineStage | null> {
  assertTenantContext(context);
  const result = await db.query<PipelineStage>(
    `select ${STAGE_RETURN_COLUMNS}
       from pipeline_stages
      where id = $1 and organization_id = $2`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}

export async function listPipelineStages(
  db: Queryable,
  context: TenantContext,
  options: { activeOnly?: boolean } = {}
): Promise<PipelineStage[]> {
  assertTenantContext(context);
  const filterActive = options.activeOnly ?? false;
  const result = await db.query<PipelineStage>(
    `select ${STAGE_RETURN_COLUMNS}
       from pipeline_stages
      where organization_id = $1
        and ($2::boolean is false or active = true)
      order by order_index asc`,
    [context.organizationId, filterActive]
  );
  return result.rows;
}

export async function updatePipelineStage(
  db: Queryable,
  context: TenantContext,
  id: string,
  patch: UpdatePipelineStageInput
): Promise<PipelineStage | null> {
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
  if (patch.orderIndex !== undefined) setColumn("order_index", patch.orderIndex);
  if (patch.isInitial !== undefined) setColumn("is_initial", patch.isInitial);
  if (patch.isWon !== undefined) setColumn("is_won", patch.isWon);
  if (patch.isLost !== undefined) setColumn("is_lost", patch.isLost);
  if (patch.active !== undefined) setColumn("active", patch.active);

  const result = await db.query<PipelineStage>(
    `update pipeline_stages
        set ${sets.join(", ")}
      where id = $1 and organization_id = $2
      returning ${STAGE_RETURN_COLUMNS}`,
    values
  );
  return result.rows[0] ?? null;
}
