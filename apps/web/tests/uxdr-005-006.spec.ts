import { expect, test } from "@playwright/test";

// UXDR-005 — Status steppers on Opportunity and Invoice detail pages.
// UXDR-006 — Opportunities + Contacts child sections on Company detail page.
// All tests run in demo mode (no API required).

// ---------------------------------------------------------------------------
// UXDR-005 — Opportunity pipeline stepper
// ---------------------------------------------------------------------------

test("opportunity detail shows pipeline stepper with current stage marked aria-current", async ({
  page,
  context,
  baseURL
}) => {
  await context.clearCookies();
  await context.addCookies([
    { name: "openerp_locale", value: "en", url: baseURL ?? "http://127.0.0.1:4173" }
  ]);
  await page.goto("/admin/crm/opportunities/demo-op-1");
  await page.waitForLoadState("domcontentloaded");

  const stepper = page.getByTestId("opportunity-pipeline-stepper");
  await expect(stepper).toBeVisible();

  // The current stage step must carry aria-current="step"
  const currentStep = stepper.locator("[aria-current='step']");
  await expect(currentStep).toHaveCount(1);
  // demo-op-1 is in stage demo-ps-2 (Proposal, orderIndex 1)
  await expect(currentStep).toHaveAttribute("data-step-state", "current");

  // The prior stage (Discovery, orderIndex 0) must be marked done
  const doneSteps = stepper.locator("[data-step-state='done']");
  await expect(doneSteps).toHaveCount(1);
});

test("opportunity detail stepper — FR locale renders stage labels", async ({
  page,
  context,
  baseURL
}) => {
  await context.clearCookies();
  await context.addCookies([
    { name: "openerp_locale", value: "fr", url: baseURL ?? "http://127.0.0.1:4173" }
  ]);
  await page.goto("/admin/crm/opportunities/demo-op-1");
  await page.waitForLoadState("domcontentloaded");

  const stepper = page.getByTestId("opportunity-pipeline-stepper");
  await expect(stepper).toBeVisible();
  // stepper must exist regardless of locale
  await expect(stepper.locator("[aria-current='step']")).toHaveCount(1);
});

// ---------------------------------------------------------------------------
// UXDR-005 — Invoice lifecycle stepper
// ---------------------------------------------------------------------------

test("invoice detail shows lifecycle stepper with current status highlighted", async ({
  page,
  context,
  baseURL
}) => {
  await context.clearCookies();
  await context.addCookies([
    { name: "openerp_locale", value: "en", url: baseURL ?? "http://127.0.0.1:4173" }
  ]);
  await page.goto("/admin/billing/invoices/demo-inv-1");
  await page.waitForLoadState("domcontentloaded");

  const stepper = page.getByTestId("invoice-lifecycle-stepper");
  await expect(stepper).toBeVisible();

  // The demo invoice is "issued" — that step must carry aria-current="step"
  const currentStep = stepper.locator("[aria-current='step']");
  await expect(currentStep).toHaveCount(1);
  await expect(currentStep).toHaveAttribute("data-step-key", "issued");

  // Draft is done; Paid is upcoming
  const doneSteps = stepper.locator("[data-step-state='done']");
  await expect(doneSteps.first()).toHaveAttribute("data-step-key", "draft");
  const upcomingSteps = stepper.locator("[data-step-state='upcoming']");
  await expect(upcomingSteps.first()).toHaveAttribute("data-step-key", "paid");
});

test("invoice detail lifecycle stepper — FR locale", async ({
  page,
  context,
  baseURL
}) => {
  await context.clearCookies();
  await context.addCookies([
    { name: "openerp_locale", value: "fr", url: baseURL ?? "http://127.0.0.1:4173" }
  ]);
  await page.goto("/admin/billing/invoices/demo-inv-1");
  await page.waitForLoadState("domcontentloaded");

  const stepper = page.getByTestId("invoice-lifecycle-stepper");
  await expect(stepper).toBeVisible();
  // The "Brouillon" step label should appear (FR translation of "Draft")
  await expect(stepper).toContainText("Brouillon");
});

// ---------------------------------------------------------------------------
// UXDR-006 — Company detail — Opportunities + Contacts sections
// ---------------------------------------------------------------------------

test("company detail renders Opportunities section with linked items in demo mode", async ({
  page,
  context,
  baseURL
}) => {
  await context.clearCookies();
  await context.addCookies([
    { name: "openerp_locale", value: "en", url: baseURL ?? "http://127.0.0.1:4173" }
  ]);
  await page.goto("/admin/crm/companies/demo-co-1");
  await page.waitForLoadState("domcontentloaded");

  // Section heading
  await expect(page.getByTestId("opportunities-section-title")).toBeVisible();
  await expect(page.getByTestId("opportunities-section-title")).toContainText("Opportunities");

  // List with demo opportunity
  const list = page.getByTestId("company-opportunities-list");
  await expect(list).toBeVisible();
  const items = list.locator(":scope > li");
  await expect(items).toHaveCount(1);

  // Each item must link to the opportunity detail
  const link = items.first().locator("a");
  await expect(link).toHaveAttribute("href", /\/admin\/crm\/opportunities\//);
  await expect(link).toContainText("Annual licence renewal");
});

test("company detail renders Contacts section with linked items in demo mode", async ({
  page,
  context,
  baseURL
}) => {
  await context.clearCookies();
  await context.addCookies([
    { name: "openerp_locale", value: "en", url: baseURL ?? "http://127.0.0.1:4173" }
  ]);
  await page.goto("/admin/crm/companies/demo-co-1");
  await page.waitForLoadState("domcontentloaded");

  // Section heading
  await expect(page.getByTestId("contacts-section-title")).toBeVisible();
  await expect(page.getByTestId("contacts-section-title")).toContainText("Contacts");

  // List with demo contact
  const list = page.getByTestId("company-contacts-list");
  await expect(list).toBeVisible();
  const items = list.locator(":scope > li");
  await expect(items).toHaveCount(1);

  // Each item must link to the contact detail
  const link = items.first().locator("a");
  await expect(link).toHaveAttribute("href", /\/admin\/crm\/contacts\//);
  await expect(link).toContainText("Alice Tremblay");
});

test("company detail child sections render in FR locale", async ({
  page,
  context,
  baseURL
}) => {
  await context.clearCookies();
  await context.addCookies([
    { name: "openerp_locale", value: "fr", url: baseURL ?? "http://127.0.0.1:4173" }
  ]);
  await page.goto("/admin/crm/companies/demo-co-1");
  await page.waitForLoadState("domcontentloaded");

  await expect(page.getByTestId("opportunities-section-title")).toContainText("Opportunites");
  await expect(page.getByTestId("contacts-section-title")).toContainText("Contacts");
  await expect(page.getByTestId("company-opportunities-list")).toBeVisible();
  await expect(page.getByTestId("company-contacts-list")).toBeVisible();
});
