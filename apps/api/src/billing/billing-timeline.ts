import type { PayloadSummary } from "@sentropic/openerp-domain";

import type { Queryable, TenantContext } from "../db/client";
import { insertTimelineEntry } from "../foundation/timeline-entries";

// Shared TimelineEntry emission for Billing services. Mirrors the CRM/Project
// pattern: the foundation repository validates the entry_type against the
// `<module>.<entity>.<verb>` grammar.

export interface EmitBillingTimelineInput {
  resourceType: "invoice";
  resourceId: string;
  entryType: string;
  payloadSummary: PayloadSummary;
}

export async function emitBillingTimelineEntry(
  db: Queryable,
  context: TenantContext,
  input: EmitBillingTimelineInput
): Promise<void> {
  await insertTimelineEntry(db, context, {
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    actorUserIdentityId: context.actorUserId,
    entryType: input.entryType,
    payloadSummary: input.payloadSummary
  });
}
