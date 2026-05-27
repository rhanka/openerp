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

// UUID-to-picker regression: opportunity create form must use a <select> for companyId,
// not a raw text input. The demo-mode select must be populated with at least one option.
test("opportunities create form has a company select (not a text input) in demo mode", async ({
  page,
  context,
  baseURL
}) => {
  await context.clearCookies();
  await context.addCookies([
    { name: "openerp_locale", value: "en", url: baseURL ?? "http://127.0.0.1:4173" }
  ]);
  await page.goto("/admin/crm/opportunities");
  await page.waitForLoadState("domcontentloaded");

  const sourceAttr = await page.getByTestId("data-source-badge").getAttribute("data-source");
  if (sourceAttr === "api") {
    test.skip(true, "Live API mode: skipping demo-mode picker assertion");
    return;
  }

  // The company field must be a <select>, not an <input type="text">
  const companySelect = page.getByTestId("company-select");
  await expect(companySelect).toBeVisible();
  await expect(companySelect).toHaveAttribute("name", "companyId");

  // Must not have a raw text input named companyId
  await expect(page.locator('input[name="companyId"]')).toHaveCount(0);

  // Select must have at least one real option (demo company)
  const options = companySelect.locator("option:not([disabled])");
  const count = await options.count();
  expect(count).toBeGreaterThanOrEqual(1);
});
