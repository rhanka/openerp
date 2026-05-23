import type {
  CreatePipelineStageInput,
  PipelineStage,
  UpdatePipelineStageInput
} from "@sentropic/openerp-domain/crm";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";
import { recordAuditEvent } from "../foundation/audit-emit";
import {
  findPipelineStageById,
  insertPipelineStage,
  listPipelineStages as listPipelineStagesRepo,
  updatePipelineStage as updatePipelineStageRepo
} from "./pipeline-stages";

export class PipelineStageNotFoundError extends Error {
  readonly code = "PIPELINE_STAGE_NOT_FOUND";
  constructor(stageId: string) {
    super(`Pipeline stage ${stageId} not found`);
  }
}

export async function createPipelineStage(
  db: Queryable,
  context: TenantContext,
  input: CreatePipelineStageInput
): Promise<PipelineStage> {
  assertTenantContext(context);
  const created = await insertPipelineStage(db, context, input);
  await recordAuditEvent(db, context, {
    action: "crm.pipeline_stage.created",
    resourceType: "pipeline_stage",
    resourceId: created.id,
    afterSummary: {
      name: created.name,
      orderIndex: created.orderIndex,
      isInitial: created.isInitial,
      isWon: created.isWon,
      isLost: created.isLost
    }
  });
  return created;
}

export async function updatePipelineStage(
  db: Queryable,
  context: TenantContext,
  id: string,
  patch: UpdatePipelineStageInput
): Promise<PipelineStage> {
  assertTenantContext(context);
  const before = await findPipelineStageById(db, context, id);
  if (!before) throw new PipelineStageNotFoundError(id);
  const updated = await updatePipelineStageRepo(db, context, id, patch);
  if (!updated) throw new PipelineStageNotFoundError(id);
  await recordAuditEvent(db, context, {
    action: "crm.pipeline_stage.updated",
    resourceType: "pipeline_stage",
    resourceId: updated.id,
    beforeSummary: { name: before.name, orderIndex: before.orderIndex, active: before.active },
    afterSummary: { name: updated.name, orderIndex: updated.orderIndex, active: updated.active }
  });
  return updated;
}

export async function getPipelineStageById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<PipelineStage | null> {
  return findPipelineStageById(db, context, id);
}

export async function listPipelineStages(
  db: Queryable,
  context: TenantContext,
  options: { activeOnly?: boolean } = {}
): Promise<PipelineStage[]> {
  return listPipelineStagesRepo(db, context, options);
}
