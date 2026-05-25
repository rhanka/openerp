import type { Company, CreateCompanyInput, UpdateCompanyInput } from "@sentropic/openerp-domain/crm";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";
import { recordAuditEvent } from "../foundation/audit-emit";
import { emitCrmTimelineEntry } from "./crm-timeline";
import {
  findCompanyById,
  insertCompany,
  listCompanies as listCompaniesRepo,
  softDeleteCompany,
  updateCompany as updateCompanyRepo
} from "./companies";

// Service for CRM Company. Each mutation emits an AuditEvent with the canonical
// crm.company.created / crm.company.updated grammar.

export class CompanyNotFoundError extends Error {
  readonly code = "COMPANY_NOT_FOUND";
  constructor(companyId: string) {
    super(`Company ${companyId} not found`);
  }
}

export async function createCompany(
  db: Queryable,
  context: TenantContext,
  input: CreateCompanyInput
): Promise<Company> {
  assertTenantContext(context);
  const created = await insertCompany(db, context, input);
  await emitCompanyAudit(db, context, {
    action: "crm.company.created",
    companyId: created.id,
    beforeSummary: null,
    afterSummary: {
      displayName: created.displayName,
      legalName: created.legalName,
      status: created.status,
      ownerUserId: created.ownerUserId,
      teamId: created.teamId
    }
  });
  await emitCrmTimelineEntry(db, context, {
    resourceType: "company",
    resourceId: created.id,
    entryType: "crm.company.created",
    payloadSummary: {
      displayName: created.displayName,
      legalName: created.legalName,
      status: created.status
    }
  });
  return created;
}

export async function updateCompany(
  db: Queryable,
  context: TenantContext,
  id: string,
  patch: UpdateCompanyInput
): Promise<Company> {
  assertTenantContext(context);
  const before = await findCompanyById(db, context, id);
  if (!before) throw new CompanyNotFoundError(id);
  const updated = await updateCompanyRepo(db, context, id, patch);
  if (!updated) throw new CompanyNotFoundError(id);
  await emitCompanyAudit(db, context, {
    action: "crm.company.updated",
    companyId: updated.id,
    beforeSummary: {
      displayName: before.displayName,
      status: before.status,
      ownerUserId: before.ownerUserId,
      teamId: before.teamId
    },
    afterSummary: {
      displayName: updated.displayName,
      status: updated.status,
      ownerUserId: updated.ownerUserId,
      teamId: updated.teamId
    }
  });
  await emitCrmTimelineEntry(db, context, {
    resourceType: "company",
    resourceId: updated.id,
    entryType: "crm.company.updated",
    payloadSummary: {
      displayName: updated.displayName,
      status: updated.status
    }
  });
  return updated;
}

export async function deleteCompany(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<void> {
  assertTenantContext(context);
  const before = await findCompanyById(db, context, id);
  if (!before) throw new CompanyNotFoundError(id);
  const deleted = await softDeleteCompany(db, context, id);
  if (!deleted) throw new CompanyNotFoundError(id);
  await emitCompanyAudit(db, context, {
    action: "crm.company.deleted",
    companyId: id,
    beforeSummary: { displayName: before.displayName, status: before.status },
    afterSummary: null
  });
  await emitCrmTimelineEntry(db, context, {
    resourceType: "company",
    resourceId: id,
    entryType: "crm.company.deleted",
    payloadSummary: { displayName: before.displayName }
  });
}

export async function getCompanyById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<Company | null> {
  return findCompanyById(db, context, id);
}

export async function listCompanies(
  db: Queryable,
  context: TenantContext,
  options: { limit?: number; offset?: number; status?: "active" | "archived" } = {}
): Promise<Company[]> {
  return listCompaniesRepo(db, context, options);
}

interface EmitCompanyAuditInput {
  action: string;
  companyId: string;
  beforeSummary: Record<string, unknown> | null;
  afterSummary: Record<string, unknown> | null;
}

async function emitCompanyAudit(
  db: Queryable,
  context: TenantContext,
  input: EmitCompanyAuditInput
): Promise<void> {
  await recordAuditEvent(db, context, {
    action: input.action,
    resourceType: "company",
    resourceId: input.companyId,
    beforeSummary: input.beforeSummary,
    afterSummary: input.afterSummary
  });
}
