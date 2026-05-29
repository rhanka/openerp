import type { SavedView, CreateSavedViewInput, UpdateSavedViewInput } from "@sentropic/openerp-domain/reporting";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";
import { recordAuditEvent } from "../foundation/audit-emit";
import {
  findSavedViewById,
  insertSavedView,
  listSavedViews as listSavedViewsRepo,
  softDeleteSavedView,
  updateSavedView as updateSavedViewRepo
} from "./saved-views";

// Service for Reporting SavedView. Each mutation emits an AuditEvent with the
// canonical reporting.saved_view.created / .updated / .deleted grammar.

export class SavedViewNotFoundError extends Error {
  readonly code = "SAVED_VIEW_NOT_FOUND";
  constructor(id: string) {
    super(`SavedView ${id} not found`);
  }
}

export async function createSavedView(
  db: Queryable,
  context: TenantContext,
  input: CreateSavedViewInput
): Promise<SavedView> {
  assertTenantContext(context);
  const created = await insertSavedView(db, context, input);
  await emitSavedViewAudit(db, context, {
    action: "reporting.saved_view.created",
    savedViewId: created.id,
    beforeSummary: null,
    afterSummary: {
      name: created.name,
      resourceType: created.resourceType,
      ownerUserId: created.ownerUserId,
      isShared: created.isShared
    }
  });
  return created;
}

export async function updateSavedView(
  db: Queryable,
  context: TenantContext,
  id: string,
  patch: UpdateSavedViewInput
): Promise<SavedView> {
  assertTenantContext(context);
  const before = await findSavedViewById(db, context, id);
  if (!before) throw new SavedViewNotFoundError(id);
  const updated = await updateSavedViewRepo(db, context, id, patch);
  if (!updated) throw new SavedViewNotFoundError(id);
  await emitSavedViewAudit(db, context, {
    action: "reporting.saved_view.updated",
    savedViewId: updated.id,
    beforeSummary: {
      name: before.name,
      resourceType: before.resourceType,
      isShared: before.isShared
    },
    afterSummary: {
      name: updated.name,
      resourceType: updated.resourceType,
      isShared: updated.isShared
    }
  });
  return updated;
}

export async function deleteSavedView(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<void> {
  assertTenantContext(context);
  const before = await findSavedViewById(db, context, id);
  if (!before) throw new SavedViewNotFoundError(id);
  const deleted = await softDeleteSavedView(db, context, id);
  if (!deleted) throw new SavedViewNotFoundError(id);
  await emitSavedViewAudit(db, context, {
    action: "reporting.saved_view.deleted",
    savedViewId: id,
    beforeSummary: { name: before.name, resourceType: before.resourceType },
    afterSummary: null
  });
}

export async function getSavedViewById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<SavedView | null> {
  return findSavedViewById(db, context, id);
}

export async function listSavedViews(
  db: Queryable,
  context: TenantContext,
  options: {
    limit?: number;
    offset?: number;
    resourceType?: string;
    ownerUserId?: string | null;
    isShared?: boolean;
  } = {}
): Promise<SavedView[]> {
  return listSavedViewsRepo(db, context, options);
}

interface EmitSavedViewAuditInput {
  action: string;
  savedViewId: string;
  beforeSummary: Record<string, unknown> | null;
  afterSummary: Record<string, unknown> | null;
}

async function emitSavedViewAudit(
  db: Queryable,
  context: TenantContext,
  input: EmitSavedViewAuditInput
): Promise<void> {
  await recordAuditEvent(db, context, {
    action: input.action,
    resourceType: "saved_view",
    resourceId: input.savedViewId,
    beforeSummary: input.beforeSummary,
    afterSummary: input.afterSummary
  });
}
