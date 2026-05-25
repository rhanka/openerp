import type { Hono } from "hono";

import type { LocaleCode } from "@sentropic/openerp-domain";
import type { AddressPayload, CompanyStatus } from "@sentropic/openerp-domain/crm";

import type { AppBindings } from "../app";
import {
  CompanyNotFoundError,
  createCompany,
  deleteCompany,
  getCompanyById,
  listCompanies,
  updateCompany
} from "../../crm/company-service";

const COMPANY_STATUSES: readonly CompanyStatus[] = ["active", "archived"];
const LOCALES: readonly LocaleCode[] = ["en", "fr"];

interface CreateBody {
  displayName: string;
  legalName?: string | null;
  ownerUserId?: string | null;
  teamId?: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  language?: LocaleCode | null;
  taxRegion?: string | null;
  billingAddress?: AddressPayload | null;
  shippingAddress?: AddressPayload | null;
}

interface UpdateBody extends Partial<CreateBody> {
  status?: CompanyStatus;
}

export function mountCrmCompanyRoutes(app: Hono<AppBindings>): void {
  app.get("/crm/companies", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const limit = parseIntOrUndefined(c.req.query("limit"));
    const offset = parseIntOrUndefined(c.req.query("offset"));
    const statusParam = c.req.query("status");
    const status = isCompanyStatus(statusParam) ? statusParam : undefined;
    const items = await listCompanies(db, tenant, {
      ...(limit !== undefined ? { limit } : {}),
      ...(offset !== undefined ? { offset } : {}),
      ...(status !== undefined ? { status } : {})
    });
    return c.json({ items });
  });

  app.post("/crm/companies", async (c) => {
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
    const created = await createCompany(db, tenant, body);
    return c.json(created, 201);
  });

  app.get("/crm/companies/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const found = await getCompanyById(db, tenant, c.req.param("id"));
    if (!found) return c.json({ code: "NOT_FOUND" }, 404);
    return c.json(found);
  });

  app.patch("/crm/companies/:id", async (c) => {
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
      const updated = await updateCompany(db, tenant, id, body);
      return c.json(updated);
    } catch (err) {
      if (err instanceof CompanyNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
      throw err;
    }
  });

  app.delete("/crm/companies/:id", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const id = c.req.param("id");
    try {
      await deleteCompany(db, tenant, id);
      return c.body(null, 204);
    } catch (err) {
      if (err instanceof CompanyNotFoundError) return c.json({ code: "NOT_FOUND" }, 404);
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
  if (body?.status !== undefined && !COMPANY_STATUSES.includes(body.status)) {
    errors.status = "INVALID";
  }
  if (body?.language !== undefined && body.language !== null && !LOCALES.includes(body.language)) {
    errors.language = "INVALID";
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

function isCompanyStatus(value: string | undefined): value is CompanyStatus {
  return value === "active" || value === "archived";
}

function parseIntOrUndefined(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && Number.isInteger(n) ? n : undefined;
}
