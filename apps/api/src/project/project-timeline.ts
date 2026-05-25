import type { PayloadSummary } from "@sentropic/openerp-domain";

import type { Queryable, TenantContext } from "../db/client";
import { insertTimelineEntry } from "../foundation/timeline-entries";

// Timeline emission for Project services. Independent from crm-timeline (which
// whitelists CRM resource types). resourceType "project" is validated by the
// foundation insertTimelineEntry + entry-type-grammar.

export interface EmitProjectTimelineInput {
  resourceId: string;
  entryType: string;
  payloadSummary: PayloadSummary;
  /** Defaults to "project". Use "project_task" for ProjectTask timeline entries. */
  resourceType?: string;
}

export async function emitProjectTimelineEntry(
  db: Queryable,
  context: TenantContext,
  input: EmitProjectTimelineInput
): Promise<void> {
  await insertTimelineEntry(db, context, {
    resourceType: input.resourceType ?? "project",
    resourceId: input.resourceId,
    actorUserIdentityId: context.actorUserId,
    entryType: input.entryType,
    payloadSummary: input.payloadSummary
  });
}
