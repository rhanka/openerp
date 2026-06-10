import type { Hono } from "hono";
import type { AppBindings } from "../app";
import type { WebhookEgressPort } from "../../webhook/webhook-egress-port";
import { runDueWebhookDeliveries } from "../../webhook/webhook-egress-tick";

/**
 * Mount the webhook admin routes onto the provided Hono app.
 *
 * Routes:
 *   POST /webhook/_admin/tick  — trigger a delivery sweep, returns RunDueWebhookDeliveriesResult.
 */
export function mountWebhookAdminRoutes(
  app: Hono<AppBindings>,
  options: { port?: WebhookEgressPort } = {}
): void {
  app.post("/webhook/_admin/tick", async (c) => {
    const db = c.get("db");
    const tenant = c.get("tenant");

    let asOf: Date | undefined;
    try {
      const body = await c.req.json<{ asOfDate?: string }>();
      if (body?.asOfDate) asOf = new Date(body.asOfDate);
    } catch {
      // body is optional — proceed without it
    }

    const deps = options.port ? { port: options.port } : {};
    const result = await runDueWebhookDeliveries(db, tenant, asOf, deps);
    return c.json(result);
  });
}
