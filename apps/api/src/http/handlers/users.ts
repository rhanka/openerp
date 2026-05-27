import type { Hono } from "hono";

import type { AppBindings } from "../app";
import { listUsers } from "../../foundation/user-identities";

function parseIntOrUndefined(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && Number.isInteger(n) ? n : undefined;
}

export function mountUsersRoutes(app: Hono<AppBindings>): void {
  app.get("/users", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");
    const limit = parseIntOrUndefined(c.req.query("limit"));
    const offset = parseIntOrUndefined(c.req.query("offset"));
    const items = await listUsers(db, tenant, {
      ...(limit !== undefined ? { limit } : {}),
      ...(offset !== undefined ? { offset } : {})
    });
    return c.json({ items });
  });
}
