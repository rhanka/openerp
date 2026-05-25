import type {
  ConvertLeadResult,
  CreateLeadInput,
  Lead,
  UpdateLeadInput
} from "@sentropic/openerp-domain/crm";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";
import { recordAuditEvent } from "../foundation/audit-emit";
import { createCompany } from "./company-service";
import { createContact } from "./contact-service";
import { createOpportunity } from "./opportunity-service";
import { emitCrmTimelineEntry } from "./crm-timeline";
import {
  findLeadById,
  insertLead,
  listLeads as listLeadsRepo,
  markLeadConverted,
  softDeleteLead,
  updateLead as updateLeadRepo
} from "./leads";

export class LeadNotFoundError extends Error {
  readonly code = "LEAD_NOT_FOUND";
  constructor(leadId: string) {
    super(`Lead ${leadId} not found`);
  }
}

export class LeadNotConvertibleError extends Error {
  readonly code = "LEAD_NOT_CONVERTIBLE";
  constructor(leadId: string, status: string) {
    super(`Lead ${leadId} cannot be converted from status '${status}'`);
  }
}

export class NoInitialPipelineStageError extends Error {
  readonly code = "NO_INITIAL_PIPELINE_STAGE";
  constructor() {
    super("Tenant has no PipelineStage flagged is_initial=true — configure one before converting leads");
  }
}

export async function createLead(
  db: Queryable,
  context: TenantContext,
  input: CreateLeadInput
): Promise<Lead> {
  assertTenantContext(context);
  const created = await insertLead(db, context, input);
  await recordAuditEvent(db, context, {
    action: "crm.lead.created",
    resourceType: "lead",
    resourceId: created.id,
    afterSummary: {
      displayName: created.displayName,
      source: created.source,
      status: created.status
    }
  });
  await emitCrmTimelineEntry(db, context, {
    resourceType: "lead",
    resourceId: created.id,
    entryType: "crm.lead.created",
    payloadSummary: {
      displayName: created.displayName,
      source: created.source,
      status: created.status
    }
  });
  return created;
}

export async function updateLead(
  db: Queryable,
  context: TenantContext,
  id: string,
  patch: UpdateLeadInput
): Promise<Lead> {
  assertTenantContext(context);
  const before = await findLeadById(db, context, id);
  if (!before) throw new LeadNotFoundError(id);
  const updated = await updateLeadRepo(db, context, id, patch);
  if (!updated) throw new LeadNotFoundError(id);
  await recordAuditEvent(db, context, {
    action: "crm.lead.updated",
    resourceType: "lead",
    resourceId: updated.id,
    beforeSummary: { status: before.status, displayName: before.displayName },
    afterSummary: { status: updated.status, displayName: updated.displayName }
  });
  return updated;
}

export async function deleteLead(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<void> {
  assertTenantContext(context);
  const before = await findLeadById(db, context, id);
  if (!before) throw new LeadNotFoundError(id);
  const deleted = await softDeleteLead(db, context, id);
  if (!deleted) throw new LeadNotFoundError(id);
  await recordAuditEvent(db, context, {
    action: "crm.lead.deleted",
    resourceType: "lead",
    resourceId: id,
    beforeSummary: { displayName: before.displayName, status: before.status },
    afterSummary: null
  });
  await emitCrmTimelineEntry(db, context, {
    resourceType: "lead",
    resourceId: id,
    entryType: "crm.lead.deleted",
    payloadSummary: { displayName: before.displayName, status: before.status }
  });
}

export async function getLeadById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<Lead | null> {
  return findLeadById(db, context, id);
}

export async function listLeads(
  db: Queryable,
  context: TenantContext,
  options: { limit?: number; offset?: number; status?: "new" | "working" | "converted" | "disqualified" } = {}
): Promise<Lead[]> {
  return listLeadsRepo(db, context, options);
}

interface InitialStageRow {
  id: string;
}

async function findInitialStage(
  db: Queryable,
  context: TenantContext
): Promise<string | null> {
  const result = await db.query<InitialStageRow>(
    `select id
       from pipeline_stages
      where organization_id = $1 and is_initial = true and active = true
      order by order_index asc
      limit 1`,
    [context.organizationId]
  );
  return result.rows[0]?.id ?? null;
}

export async function convertLead(
  db: Queryable,
  context: TenantContext,
  leadId: string
): Promise<ConvertLeadResult> {
  assertTenantContext(context);
  const lead = await findLeadById(db, context, leadId);
  if (!lead) throw new LeadNotFoundError(leadId);
  if (lead.status !== "new" && lead.status !== "working") {
    throw new LeadNotConvertibleError(leadId, lead.status);
  }

  const initialStageId = await findInitialStage(db, context);
  if (!initialStageId) throw new NoInitialPipelineStageError();

  // Atomic conversion: assumes the caller wraps the call in a transaction (the
  // HTTP handler enforces this with the pool.withClient pattern). All four
  // writes share the same TenantContext, so each emits its own audit + timeline
  // row consistent with the canon grammar.
  const companyDisplayName = lead.companyName ?? lead.displayName;
  const company = await createCompany(db, context, {
    displayName: companyDisplayName,
    email: lead.email,
    phone: lead.phone
  });

  let contact: ConvertLeadResult["contact"] = null;
  if (lead.contactName || lead.email || lead.phone) {
    contact = await createContact(db, context, {
      displayName: lead.contactName ?? lead.displayName,
      companyId: company.id,
      email: lead.email,
      phone: lead.phone
    });
  }

  const opportunity = await createOpportunity(db, context, {
    companyId: company.id,
    primaryContactId: contact?.id ?? null,
    name: `${companyDisplayName} — Opportunity`,
    stageId: initialStageId
  });

  const converted = await markLeadConverted(db, context, leadId, {
    companyId: company.id,
    contactId: contact?.id ?? null,
    opportunityId: opportunity.id
  });
  if (!converted) throw new LeadNotConvertibleError(leadId, lead.status);

  await recordAuditEvent(db, context, {
    action: "crm.lead.converted",
    resourceType: "lead",
    resourceId: converted.id,
    beforeSummary: { status: lead.status },
    afterSummary: {
      status: "converted",
      companyId: company.id,
      contactId: contact?.id ?? null,
      opportunityId: opportunity.id
    }
  });
  await emitCrmTimelineEntry(db, context, {
    resourceType: "lead",
    resourceId: converted.id,
    entryType: "crm.lead.converted",
    payloadSummary: {
      companyId: company.id,
      contactId: contact?.id ?? null,
      opportunityId: opportunity.id
    }
  });

  return { lead: converted, company, contact, opportunity };
}
