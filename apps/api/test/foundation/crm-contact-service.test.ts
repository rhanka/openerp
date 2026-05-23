import { describe, expect, it } from "vitest";

import type { Contact } from "@sentropic/openerp-domain/crm";

import type { Queryable } from "../../src/db/client";
import {
  ContactNotFoundError,
  createContact,
  listContacts,
  updateContact
} from "../../src/crm/contact-service";

interface AuditRow {
  organizationId: string;
  actorUserId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  beforeSummary: unknown;
  afterSummary: unknown;
}

function makeFakeDb() {
  const contacts: Contact[] = [];
  const audits: AuditRow[] = [];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;

      if (t.includes("insert into contacts")) {
        const [
          organizationId,
          companyId,
          displayName,
          firstName,
          lastName,
          title,
          email,
          phone,
          language,
          ownerUserId
        ] = values as [
          string,
          string | null,
          string,
          string | null,
          string | null,
          string | null,
          string | null,
          string | null,
          "en" | "fr" | null,
          string | null
        ];
        const row: Contact = {
          id: `ct_${contacts.length + 1}`,
          organizationId,
          companyId,
          displayName,
          firstName,
          lastName,
          title,
          email,
          phone,
          language,
          status: "active",
          ownerUserId,
          createdAt: "2026-05-23T08:00:00.000Z",
          updatedAt: "2026-05-23T08:00:00.000Z"
        };
        contacts.push(row);
        return { rows: [row as unknown as T] };
      }

      if (t.includes("from contacts") && t.includes("where id = $1")) {
        const [id, organizationId] = values as [string, string];
        const found = contacts.find((c) => c.id === id && c.organizationId === organizationId);
        return { rows: found ? [found as unknown as T] : [] };
      }

      if (t.includes("from contacts") && t.includes("order by display_name")) {
        const [organizationId, status, companyIdFilter, limit, offset] = values as [
          string,
          string | null,
          string | null,
          number,
          number
        ];
        const filtered = contacts
          .filter((c) => c.organizationId === organizationId)
          .filter((c) => (status ? c.status === status : true))
          .filter((c) => (companyIdFilter ? c.companyId === companyIdFilter : true))
          .sort((a, b) => a.displayName.localeCompare(b.displayName))
          .slice(offset, offset + limit);
        return { rows: filtered as unknown as T[] };
      }

      if (t.includes("update contacts")) {
        const [id, organizationId] = values as [string, string];
        const idx = contacts.findIndex((c) => c.id === id && c.organizationId === organizationId);
        if (idx === -1) return { rows: [] };
        const trailing = values.slice(2);
        const patch: Partial<Contact> = {};
        if (t.includes("display_name = $")) {
          patch.displayName = String(trailing[0]);
        }
        if (t.includes("status = $")) {
          const statusValue = trailing.find((v) => v === "active" || v === "inactive");
          if (statusValue !== undefined) patch.status = statusValue as Contact["status"];
        }
        contacts[idx] = { ...contacts[idx]!, ...patch, updatedAt: "2026-05-23T08:05:00.000Z" };
        return { rows: [contacts[idx]! as unknown as T] };
      }

      if (t.includes("insert into audit_events")) {
        const [
          organizationId,
          actorUserId,
          _actorType,
          action,
          resourceType,
          resourceId,
          beforeSummary,
          afterSummary
        ] = values as [string, string, string, string, string, string, unknown, unknown];
        void _actorType;
        audits.push({
          organizationId,
          actorUserId,
          action,
          resourceType,
          resourceId,
          beforeSummary,
          afterSummary
        });
        return { rows: [] };
      }

      return { rows: [] };
    }
  };

  return { db, contacts, audits };
}

const context = { organizationId: "org_1", actorUserId: "user_actor" };

describe("ContactService (CRM Demo Slice 2.1)", () => {
  it("creates a contact and emits crm.contact.created", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createContact(db, context, {
      displayName: "Alice Tremblay",
      email: "alice@northwind.local"
    });
    expect(created.displayName).toBe("Alice Tremblay");
    expect(created.status).toBe("active");
    expect(audits).toHaveLength(1);
    expect(audits[0]!.action).toBe("crm.contact.created");
    expect(audits[0]!.resourceType).toBe("contact");
    expect(audits[0]!.resourceId).toBe(created.id);
  });

  it("updates a contact and emits crm.contact.updated with before/after", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createContact(db, context, { displayName: "Bob" });
    const updated = await updateContact(db, context, created.id, {
      displayName: "Bob Senior",
      status: "inactive"
    });
    expect(updated.displayName).toBe("Bob Senior");
    expect(updated.status).toBe("inactive");
    const updateAudit = audits.find((a) => a.action === "crm.contact.updated");
    expect(updateAudit).toBeDefined();
    expect(updateAudit!.beforeSummary).toMatchObject({ displayName: "Bob", status: "active" });
    expect(updateAudit!.afterSummary).toMatchObject({ displayName: "Bob Senior", status: "inactive" });
  });

  it("throws ContactNotFoundError on missing id", async () => {
    const { db } = makeFakeDb();
    await expect(
      updateContact(db, context, "ct_nope", { displayName: "X" })
    ).rejects.toBeInstanceOf(ContactNotFoundError);
  });

  it("lists contacts ordered by display name with companyId filter", async () => {
    const { db } = makeFakeDb();
    await createContact(db, context, { displayName: "Bravo", companyId: "co_1" });
    await createContact(db, context, { displayName: "Alpha", companyId: "co_2" });
    const all = await listContacts(db, context);
    expect(all.map((c) => c.displayName)).toEqual(["Alpha", "Bravo"]);

    const scoped = await listContacts(db, context, { companyId: "co_1" });
    expect(scoped.map((c) => c.displayName)).toEqual(["Bravo"]);
  });
});
