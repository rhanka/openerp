import type { Hono } from "hono";

import type { LocaleCode } from "@sentropic/openerp-domain";
import type { ContactStatus } from "@sentropic/openerp-domain/crm";

import type { AppBindings } from "../app";
import {
  ContactNotFoundError,
  createContact,
  getContactById,
  listContacts,
  updateContact
} from "../../crm/contact-service";

const CONTACT_STATUSES: readonly ContactStatus[] = ["active", "inactive"];
const LOCALES: readonly LocaleCode[] = ["en", "fr"];

interface CreateBody {
  displayName: string;
  companyId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  language?: LocaleCode | null;
  ownerUserId?: string | null;
}

interface UpdateBody extends Partial<CreateBody> {
  status?: ContactStatus;
}

export function mountCrmContactRoutes(app: Hono<AppBindings>): void {
  app.get("/crm/contacts", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const limit = parseIntOrUndefined(c.req.query("limit"));
    const offset = parseIntOrUndefined(c.req.query("offset"));
    const statusParam = c.req.query("status");
    const status = isContactStatus(statusParam) ? statusParam : undefined;
    const companyId = c.req.query("companyId") ?? undefined;
    const items = await listContacts(db, tenant, {
      ...(limit !== undefined ? { limit } : {}),
      ...(offset !== undefined ? { offset } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(companyId !== undefined ? { companyId } : {})
    });
    return c.json({ items });
  });

  app.post("/crm/contacts", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    let body: CreateBody;
    try {
      body = await c.req.json<CreateBody>();
    } catch {
      return c.json({ code: "INVALID_JSON" }, 400);
    }
    const validation = validateCreate(body);
    if (!validation.ok) {
      return c.json({ code: "INVALID_INPUT", errors: validation.errors }, 400);
    }
    const created = await createContact(db, tenant, body);
    return c.json(created, 201);
  });

  app.get("/crm/contacts/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const found = await getContactById(db, tenant, c.req.param("id"));
    if (!found) return c.json({ code: "NOT_FOUND" }, 404);
    return c.json(found);
  });

  app.patch("/crm/contacts/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    let body: UpdateBody;
    try {
      body = await c.req.json<UpdateBody>();
    } catch {
      return c.json({ code: "INVALID_JSON" }, 400);
    }
    const validation = validateUpdate(body);
    if (!validation.ok) {
      return c.json({ code: "INVALID_INPUT", errors: validation.errors }, 400);
    }
    try {
      const updated = await updateContact(db, tenant, id, body);
      return c.json(updated);
    } catch (err) {
      if (err instanceof ContactNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      throw err;
    }
  });
}

interface Validation {
  ok: boolean;
  errors: Record<string, string>;
}

function validateCreate(body: CreateBody): Validation {
  const errors: Record<string, string> = {};
  if (!body?.displayName || typeof body.displayName !== "string" || body.displayName.trim() === "") {
    errors.displayName = "REQUIRED";
  }
  if (body?.language != null && !LOCALES.includes(body.language)) {
    errors.language = "INVALID";
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

function validateUpdate(body: UpdateBody): Validation {
  const errors: Record<string, string> = {};
  if (body?.displayName !== undefined && (typeof body.displayName !== "string" || body.displayName.trim() === "")) {
    errors.displayName = "INVALID";
  }
  if (body?.status !== undefined && !CONTACT_STATUSES.includes(body.status)) {
    errors.status = "INVALID";
  }
  if (body?.language !== undefined && body.language !== null && !LOCALES.includes(body.language)) {
    errors.language = "INVALID";
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

function isContactStatus(value: string | undefined): value is ContactStatus {
  return value === "active" || value === "inactive";
}

function parseIntOrUndefined(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && Number.isInteger(n) ? n : undefined;
}
