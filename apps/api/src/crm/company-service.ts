import type { Company, CreateCompanyInput, UpdateCompanyInput } from "@sentropic/openerp-domain/crm";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";
import {
  findCompanyById,
  insertCompany,
  listCompanies as listCompaniesRepo,
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
  return updated;
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
  await db.query(
    `insert into audit_events (
       organization_id, actor_user_id, actor_type, action, resource_type, resource_id,
       before_summary, after_summary
     ) values ($1, $2, 'user', $3, 'company', $4, $5, $6)`,
    [
      context.organizationId,
      context.actorUserId,
      input.action,
      input.companyId,
      input.beforeSummary,
      input.afterSummary
    ]
  );
}
