import type { PayloadSummary } from "@sentropic/openerp-domain";

import type { Queryable, TenantContext } from "../db/client";
import { insertTimelineEntry } from "../foundation/timeline-entries";

// Shared TimelineEntry emission for CRM services. The foundation repository
// (apps/api/src/foundation/timeline-entries.ts) validates the entry_type
// against the `<module>.<entity>.<verb>` grammar; pass values that already
// match the audit grammar to keep both projections in sync.

export interface EmitCrmTimelineInput {
  resourceType: "company" | "contact" | "opportunity" | "lead";
  resourceId: string;
  entryType: string;
  payloadSummary: PayloadSummary;
}

export async function emitCrmTimelineEntry(
  db: Queryable,
  context: TenantContext,
  input: EmitCrmTimelineInput
): Promise<void> {
  await insertTimelineEntry(db, context, {
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    // The CRM services receive a TenantContext that names a tenant user id;
    // for seeded and dev tenants this id is reused as the global identity id.
    // When auth wiring stops sharing the value, this helper will pull the
    // identity id from a session resolver instead.
    actorUserIdentityId: context.actorUserId,
    entryType: input.entryType,
    payloadSummary: input.payloadSummary
  });
}
