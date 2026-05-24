import type { Contact, CreateContactInput, UpdateContactInput } from "@sentropic/openerp-domain/crm";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";
import { recordAuditEvent } from "../foundation/audit-emit";
import { emitCrmTimelineEntry } from "./crm-timeline";
import {
  findContactById,
  insertContact,
  listContacts as listContactsRepo,
  updateContact as updateContactRepo
} from "./contacts";

export class ContactNotFoundError extends Error {
  readonly code = "CONTACT_NOT_FOUND";
  constructor(contactId: string) {
    super(`Contact ${contactId} not found`);
  }
}

export async function createContact(
  db: Queryable,
  context: TenantContext,
  input: CreateContactInput
): Promise<Contact> {
  assertTenantContext(context);
  const created = await insertContact(db, context, input);
  await recordAuditEvent(db, context, {
    action: "crm.contact.created",
    resourceType: "contact",
    resourceId: created.id,
    afterSummary: {
      displayName: created.displayName,
      companyId: created.companyId,
      email: created.email,
      status: created.status
    }
  });
  await emitCrmTimelineEntry(db, context, {
    resourceType: "contact",
    resourceId: created.id,
    entryType: "crm.contact.created",
    payloadSummary: {
      displayName: created.displayName,
      companyId: created.companyId,
      email: created.email
    }
  });
  return created;
}

export async function updateContact(
  db: Queryable,
  context: TenantContext,
  id: string,
  patch: UpdateContactInput
): Promise<Contact> {
  assertTenantContext(context);
  const before = await findContactById(db, context, id);
  if (!before) throw new ContactNotFoundError(id);
  const updated = await updateContactRepo(db, context, id, patch);
  if (!updated) throw new ContactNotFoundError(id);
  await recordAuditEvent(db, context, {
    action: "crm.contact.updated",
    resourceType: "contact",
    resourceId: updated.id,
    beforeSummary: {
      displayName: before.displayName,
      companyId: before.companyId,
      status: before.status,
      email: before.email
    },
    afterSummary: {
      displayName: updated.displayName,
      companyId: updated.companyId,
      status: updated.status,
      email: updated.email
    }
  });
  await emitCrmTimelineEntry(db, context, {
    resourceType: "contact",
    resourceId: updated.id,
    entryType: "crm.contact.updated",
    payloadSummary: {
      displayName: updated.displayName,
      companyId: updated.companyId,
      status: updated.status
    }
  });
  return updated;
}

export async function getContactById(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<Contact | null> {
  return findContactById(db, context, id);
}

export async function listContacts(
  db: Queryable,
  context: TenantContext,
  options: { limit?: number; offset?: number; status?: "active" | "inactive"; companyId?: string | null } = {}
): Promise<Contact[]> {
  return listContactsRepo(db, context, options);
}
