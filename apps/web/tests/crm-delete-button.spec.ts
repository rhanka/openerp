import { expect, test } from "@playwright/test";

const crmListPages: Array<{ path: string; heading: string | RegExp; listTestId: string }> = [
  { path: "/admin/crm/companies", heading: /Companies|Societes/, listTestId: "crm-companies-list" },
  { path: "/admin/crm/contacts", heading: /Contacts/, listTestId: "crm-contacts-list" },
  { path: "/admin/crm/opportunities", heading: /Opportunities|Opportunites/, listTestId: "crm-opportunities-list" },
  { path: "/admin/crm/leads", heading: /Leads/, listTestId: "crm-leads-list" }
];

for (const route of crmListPages) {
  test(`CRM list ${route.path} renders a Delete button in demo mode`, async ({ page }) => {
    await page.goto(route.path);
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { name: route.heading })).toBeVisible();

    const sourceAttr = await page.getByTestId("data-source-badge").getAttribute("data-source");
    if (sourceAttr === "api") {
      test.skip(true, "Live API mode: skipping demo-mode Delete button assertion");
      return;
    }

    const list = page.getByTestId(route.listTestId);
    await expect(list).toBeVisible();
    await expect(list.getByTestId("crm-delete-btn").first()).toBeVisible();
  });
}
