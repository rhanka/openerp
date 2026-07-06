/**
 * Chat dock — integration 3-A/3-B feature flag tests.
 *
 * (a) Without the flag → no chat dock in the DOM.
 * (b) With cookie openerp_chat=1 → dock root mounts (data-testid="chat-dock").
 * (c) Flag ON + no OPENERP_CHAT_ENDPOINT → dock still mounts, shell is not broken.
 */

import { expect, test } from "@playwright/test";

const TARGET_ROUTE = "/admin/reporting/dashboards";

// (a) Flag OFF — default: no chat dock in the DOM.
test("chat dock is absent when flag is off", async ({ page }) => {
  await page.goto(TARGET_ROUTE);
  // The shell should render without errors — use the specific Admin nav as a sentinel.
  // UXDR-009 : le panneau ne montre que le module actif — sentinelle = nav Reporting.
  await expect(page.getByRole("navigation", { name: "Reporting" })).toBeVisible();
  // No chat dock element should be present.
  await expect(page.getByTestId("chat-dock")).not.toBeAttached();
});

// (b) Flag ON via cookie → dock root mounts.
test("chat dock mounts when openerp_chat=1 cookie is set", async ({ page, context }) => {
  // Set the feature-flag cookie before navigating.
  await context.addCookies([
    {
      name: "openerp_chat",
      value: "1",
      domain: "127.0.0.1",
      path: "/",
    },
  ]);

  await page.goto(TARGET_ROUTE);

  // The shell nav must still be present (flag must not break layout).
  // UXDR-009 : le panneau ne montre que le module actif — sentinelle = nav Reporting.
  await expect(page.getByRole("navigation", { name: "Reporting" })).toBeVisible();

  // The chat-dock root element must be in the DOM.
  await expect(page.getByTestId("chat-dock")).toBeAttached();
});

// (c) Flag ON + no endpoint → dock still mounts, shell not broken.
test("chat dock mounts without crashing when endpoint is not configured", async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: "openerp_chat",
      value: "1",
      domain: "127.0.0.1",
      path: "/",
    },
  ]);

  await page.goto(TARGET_ROUTE);

  // Shell remains functional.
  // UXDR-009 : le panneau ne montre que le module actif — sentinelle = nav Reporting.
  await expect(page.getByRole("navigation", { name: "Reporting" })).toBeVisible();

  // Dock is present regardless of endpoint state (transport errors must not crash the shell).
  await expect(page.getByTestId("chat-dock")).toBeAttached();
});
