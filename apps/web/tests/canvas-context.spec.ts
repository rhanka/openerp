import { expect, test, type Page } from "@playwright/test";

/**
 * Canvas view-context store — integration 2-A.
 *
 * Validates that window.__openerpCanvasContext is populated correctly on
 * navigation, covering: detail with id, list without id, workflows,
 * webhooks, a CRM detail, and an unknown route.
 *
 * Note: the pure deriveCanvasContext logic is exercised indirectly via the
 * browser (no vitest runner in this workspace). The window accessor is set by
 * a Svelte $effect that runs AFTER client hydration, so each read waits for
 * the accessor to be defined rather than reading right after domcontentloaded.
 */

interface CanvasCtx {
  route: string;
  resourceType: string | null;
  resourceId: string | null;
}

async function readCanvasContext(page: Page): Promise<CanvasCtx> {
  // Wait until the hydration $effect has installed the accessor.
  await page.waitForFunction(
    () => (window as unknown as Record<string, unknown>).__openerpCanvasContext !== undefined,
    undefined,
    { timeout: 15000 }
  );
  return page.evaluate(
    () => (window as unknown as Record<string, unknown>).__openerpCanvasContext as unknown as CanvasCtx
  );
}

async function gotoEn(page: Page, context: import("@playwright/test").BrowserContext, baseURL: string | undefined, path: string): Promise<void> {
  await context.clearCookies();
  await context.addCookies([{
    name: "openerp_locale",
    value: "en",
    url: baseURL ?? "http://127.0.0.1:4173"
  }]);
  await page.goto(path);
  await page.waitForLoadState("domcontentloaded");
}

test.describe("Canvas view-context store (2-A)", () => {
  test("dashboards list → resourceType reporting.dashboard, resourceId null", async ({ page, context, baseURL }) => {
    await gotoEn(page, context, baseURL, "/admin/reporting/dashboards");
    const ctx = await readCanvasContext(page);
    expect(ctx.resourceType).toBe("reporting.dashboard");
    expect(ctx.resourceId).toBeNull();
    expect(ctx.route).toBe("/admin/reporting/dashboards");
  });

  test("dashboards detail with id → resourceType reporting.dashboard, resourceId set", async ({ page, context, baseURL }) => {
    const fakeId = "00000000-0000-0000-0000-000000000001";
    await gotoEn(page, context, baseURL, `/admin/reporting/dashboards/${fakeId}`);
    const ctx = await readCanvasContext(page);
    expect(ctx.resourceType).toBe("reporting.dashboard");
    expect(ctx.resourceId).toBe(fakeId);
  });

  test("workflows list → resourceType workflow.workflow_definition", async ({ page, context, baseURL }) => {
    await gotoEn(page, context, baseURL, "/admin/reporting/workflows");
    const ctx = await readCanvasContext(page);
    expect(ctx.resourceType).toBe("workflow.workflow_definition");
    expect(ctx.resourceId).toBeNull();
  });

  test("webhooks list → resourceType webhook.webhook_endpoint", async ({ page, context, baseURL }) => {
    await gotoEn(page, context, baseURL, "/admin/reporting/webhooks");
    const ctx = await readCanvasContext(page);
    expect(ctx.resourceType).toBe("webhook.webhook_endpoint");
    expect(ctx.resourceId).toBeNull();
  });

  test("CRM companies detail → resourceType crm.company, resourceId set", async ({ page, context, baseURL }) => {
    const fakeId = "00000000-0000-0000-0000-000000000002";
    await gotoEn(page, context, baseURL, `/admin/crm/companies/${fakeId}`);
    const ctx = await readCanvasContext(page);
    expect(ctx.resourceType).toBe("crm.company");
    expect(ctx.resourceId).toBe(fakeId);
  });

  test("unknown route → resourceType null, resourceId null", async ({ page, context, baseURL }) => {
    // Root "/" is not an admin route (may redirect; any non-admin path → nulls).
    await gotoEn(page, context, baseURL, "/");
    const ctx = await readCanvasContext(page);
    expect(ctx.resourceType).toBeNull();
    expect(ctx.resourceId).toBeNull();
  });
});
