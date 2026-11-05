import { expect, type APIRequestContext, test } from "@playwright/test";

type Locale = "en" | "fr";

const route = "/admin/billing/reconciliation";

async function waitForHydration(page: import("@playwright/test").Page): Promise<void> {
  await page.waitForFunction(
    () => document.documentElement.getAttribute("data-hydrated") === "true",
    { timeout: 10_000 }
  );
}

async function setLocale(page: import("@playwright/test").Page, context: import("@playwright/test").BrowserContext, baseURL: string | undefined, locale: Locale) {
  await context.clearCookies();
  await context.addCookies([{
    name: "openerp_locale",
    value: locale,
    url: baseURL ?? "http://127.0.0.1:4173"
  }]);
  await page.goto(route);
  await page.waitForLoadState("domcontentloaded");
  await waitForHydration(page);
}

function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  return expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

function liveApiConfig(): {
  apiUrl: string;
  headers: () => Record<string, string>;
} | null {
  const apiUrl = process.env.OPENERP_API_URL;
  const organizationId = process.env.OPENERP_DEV_ORG_ID;
  const userId = process.env.OPENERP_DEV_USER_ID;
  if (!apiUrl || !organizationId || !userId) return null;
  return {
    apiUrl,
    headers: () => ({
      "content-type": "application/json",
      "x-organization-id": organizationId,
      "x-user-identity-id": userId
    })
  };
}

async function postJson<T>(request: APIRequestContext, live: NonNullable<ReturnType<typeof liveApiConfig>>, path: string, data?: unknown): Promise<T> {
  const response = await request.post(`${live.apiUrl}${path}`, {
    headers: live.headers(),
    ...(data === undefined ? {} : { data })
  });
  expect(response.ok(), `${path} → ${response.status()}`).toBe(true);
  return await response.json() as T;
}

async function createUnmatchedLine(
  request: APIRequestContext,
  live: NonNullable<ReturnType<typeof liveApiConfig>>,
  tag: string,
  amount = 10101
): Promise<{ transactionId: string; description: string }> {
  const description = `PW bank line ${tag}`;
  const imported = await postJson<{ imported: Array<{ id: string }> }>(request, live, "/banking/import", {
    provider: "ofx-upload",
    account: {
      id: `pw-account-${tag}`,
      providerRef: `pw-account-${tag}`,
      name: `PW account ${tag}`,
      type: "checking",
      currency: "CAD",
      institution: "PW Bank"
    },
    transactions: [{
      id: `pw-transaction-${tag}`,
      accountId: `pw-account-${tag}`,
      postedAt: "2026-07-24",
      amount: amount / 100,
      currency: "CAD",
      description,
      status: "posted",
      providerRef: `pw-transaction-${tag}`
    }]
  });
  return { transactionId: imported.imported[0]!.id, description };
}

async function createPair(
  request: APIRequestContext,
  live: NonNullable<ReturnType<typeof liveApiConfig>>,
  tag: string,
  amount = 10203
): Promise<{ transactionId: string; description: string }> {
  const company = await postJson<{ id: string }>(request, live, "/crm/companies", {
    displayName: `PW banking ${tag}`
  });
  const money = { amountMinor: amount, currency: "CAD", scale: 2 };
  const invoice = await postJson<{ id: string }>(request, live, "/billing/invoices", {
    companyId: company.id,
    currency: "CAD",
    lines: [{ description: `PW banking ${tag}`, quantity: 1, unitPrice: money, amount: money }]
  });
  await postJson(request, live, `/billing/invoices/${invoice.id}/issue`);
  await postJson(request, live, "/billing/payments", {
    invoiceId: invoice.id,
    amount: money,
    paymentDate: "2026-07-24",
    method: "bank_transfer",
    reference: `PW-${tag}`
  });
  const line = await createUnmatchedLine(request, live, tag, amount);
  await postJson(request, live, "/banking/reconciliation/refresh");
  return line;
}

test.describe("Bank reconciliation worklist — demo presentation", () => {
  test("renders the route and all three URL views in French and English", async ({ page, context, baseURL }) => {
    if (liveApiConfig()) {
      test.skip(true, "Demo fixture assertions run without OPENERP_API_URL.");
      return;
    }
    for (const locale of ["fr", "en"] as const) {
      await setLocale(page, context, baseURL, locale);
      await expect(page.getByRole("heading", {
        name: locale === "fr" ? "Rapprochement bancaire" : "Bank reconciliation",
        exact: true
      })).toBeVisible();
      await expect(page.getByRole("link", {
        name: locale === "fr" ? "Rapprochement bancaire" : "Bank reconciliation",
        exact: true
      })).toHaveAttribute("aria-current", "page");

      for (const view of ["unmatched", "matched", "ignored"] as const) {
        await page.goto(`${route}?status=${view}`);
        await page.waitForLoadState("domcontentloaded");
        await waitForHydration(page);
        const activeLabel = locale === "fr"
          ? { unmatched: "A rapprocher", matched: "Rapprochees", ignored: "Ignorees" }[view]
          : { unmatched: "To reconcile", matched: "Reconciled", ignored: "Ignored" }[view];
        await expect(page.getByRole("link", { name: activeLabel, exact: true })).toHaveAttribute("aria-current", "page");
        await expect(page.getByTestId("reconciliation-worklist")).toBeVisible();
      }
    }
  });

  test("expands a stored proposal without rendering a score", async ({ page, context, baseURL }) => {
    if (liveApiConfig()) {
      test.skip(true, "Demo fixture assertions run without OPENERP_API_URL.");
      return;
    }
    await setLocale(page, context, baseURL, "en");
    const row = page.locator("[data-worklist-row='demo-bank-unmatched-proposal']");
    await row.getByRole("button", { name: "Show stored proposal" }).click();
    await expect(row.getByRole("heading", { name: "Bank line" })).toBeVisible();
    await expect(row.getByRole("heading", { name: "Proposed payment" })).toBeVisible();
    await expect(row.getByRole("heading", { name: "Stored evidence" })).toBeVisible();
    await expect(row.getByText("Confirming attests this match and creates no accounting entry.")).toBeVisible();
    await expect(row).not.toContainText("100%");
    await expect(row).not.toContainText("0.95");
  });

  test("keeps modal focus trapped and returns it to the reject trigger on Escape", async ({ page, context, baseURL }) => {
    if (liveApiConfig()) {
      test.skip(true, "Demo fixture assertions run without OPENERP_API_URL.");
      return;
    }
    await setLocale(page, context, baseURL, "en");
    const row = page.locator("[data-worklist-row='demo-bank-unmatched-proposal']");
    await row.getByRole("button", { name: "Show stored proposal" }).click();
    const reject = row.getByRole("button", { name: "Reject this proposal" });
    await reject.focus();
    await reject.click();
    const dialog = page.getByRole("dialog", { name: "Reject this proposal?" });
    await expect(dialog).toBeVisible();
    for (let index = 0; index < 8; index += 1) await page.keyboard.press("Tab");
    await expect.poll(() => page.evaluate(() => {
      const dialogElement = document.querySelector("[role='dialog']");
      return !!dialogElement && dialogElement.contains(document.activeElement);
    })).toBe(true);
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(reject).toBeFocused();
  });

  test("renders each mutation error without removing the demo row", async ({ page, context, baseURL }) => {
    if (liveApiConfig()) {
      test.skip(true, "Demo fixture assertions run without OPENERP_API_URL.");
      return;
    }
    await setLocale(page, context, baseURL, "en");
    const unmatched = page.locator("[data-worklist-row='demo-bank-unmatched-proposal']");
    await unmatched.getByRole("button", { name: "Show stored proposal" }).click();
    await unmatched.getByRole("button", { name: "Confirm reconciliation" }).click();
    await expect(page.getByTestId("reconciliation-action-error")).toContainText("Action unavailable in demo data");
    await expect(unmatched).toBeVisible();

    await unmatched.getByRole("button", { name: "Reject this proposal" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Reject this proposal" }).click();
    await expect(page.getByTestId("reconciliation-action-error")).toContainText("Action unavailable in demo data");
    await expect(unmatched).toBeVisible();

    await page.goto(`${route}?status=matched`);
    await page.waitForLoadState("domcontentloaded");
    await waitForHydration(page);
    const matched = page.locator("[data-worklist-row='demo-bank-matched']");
    await matched.getByRole("button", { name: "Show stored proposal" }).click();
    await matched.getByRole("button", { name: "Undo reconciliation" }).click();
    await expect(page.getByTestId("reconciliation-action-error")).toContainText("Action unavailable in demo data");
    await expect(matched).toBeVisible();

    await page.goto(`${route}?status=ignored`);
    await page.waitForLoadState("domcontentloaded");
    await waitForHydration(page);
    const ignored = page.locator("[data-worklist-row='demo-bank-ignored']");
    await ignored.getByRole("button", { name: "Restore line" }).click();
    await expect(page.getByTestId("reconciliation-action-error")).toContainText("Action unavailable in demo data");
    await expect(ignored).toBeVisible();
  });

  test("has no horizontal overflow at the 375 by 812 mobile behaviour viewport", async ({ page, context, baseURL }) => {
    if (liveApiConfig()) {
      test.skip(true, "Demo fixture assertions run without OPENERP_API_URL.");
      return;
    }
    await page.setViewportSize({ width: 375, height: 812 });
    await setLocale(page, context, baseURL, "fr");
    const row = page.locator("[data-worklist-row='demo-bank-unmatched-proposal']");
    await row.getByRole("button", { name: "Afficher la proposition stockee pour Northwind payment REF-120" }).click();
    await expectNoHorizontalOverflow(page);
  });
});

test.describe.serial("Bank reconciliation worklist — live server actions", () => {
  test("distinguishes the four empty states across an isolated banking workflow", async ({ page, request, context, baseURL }) => {
    const live = liveApiConfig();
    if (!live) {
      test.skip(true, "Requires OPENERP_API_URL, OPENERP_DEV_ORG_ID, and OPENERP_DEV_USER_ID.");
      return;
    }
    await setLocale(page, context, baseURL, "en");
    await expect(page.getByRole("heading", { name: "No bank lines imported" })).toBeVisible();

    const line = await createUnmatchedLine(request, live, `empty-${Date.now()}`);
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await waitForHydration(page);
    await expect(page.getByRole("heading", { name: "No proposal yet" })).toBeVisible();
    await page.getByTestId("reconciliation-refresh").click();
    await expect(page.getByTestId("reconciliation-action-success")).toContainText("Proposals recalculated");
    await expect(page.getByRole("heading", { name: "No proposal found" })).toBeVisible();

    const row = page.locator(`[data-worklist-row='${line.transactionId}']`);
    await row.getByRole("button", { name: "Ignore line" }).click();
    const dialog = page.getByRole("dialog", { name: "Ignore this bank line?" });
    await dialog.getByRole("button", { name: "Ignore line" }).click();
    await expect(page.getByTestId("reconciliation-action-success")).toContainText("Bank line ignored");
    await expect(page.getByRole("heading", { name: "Everything on this page is handled" })).toBeVisible();
  });

  test("runs refresh, confirm, undo, reject, ignore, and restore through form actions", async ({ page, request, context, baseURL }, testInfo) => {
    const live = liveApiConfig();
    if (!live) {
      test.skip(true, "Requires OPENERP_API_URL, OPENERP_DEV_ORG_ID, and OPENERP_DEV_USER_ID.");
      return;
    }
    const seed = `${Date.now()}`;
    const confirmPair = await createPair(request, live, `confirm-${seed}`);
    const rejectPair = await createPair(request, live, `reject-${seed}`);
    const ignoreLine = await createUnmatchedLine(request, live, `ignore-${seed}`);

    await setLocale(page, context, baseURL, "en");
    const confirmRow = page.locator(`[data-worklist-row='${confirmPair.transactionId}']`);
    await confirmRow.getByRole("button", { name: /Show stored proposal/ }).click();
    await confirmRow.getByRole("button", { name: "Confirm reconciliation" }).click();
    await expect(page.getByTestId("reconciliation-action-success")).toContainText("Reconciliation confirmed");
    await expect.poll(() => page.evaluate(() => document.activeElement?.hasAttribute("data-row-focus") ?? false)).toBe(true);

    await page.goto(`${route}?status=matched`);
    await page.waitForLoadState("domcontentloaded");
    await waitForHydration(page);
    const matchedRow = page.locator(`[data-worklist-row='${confirmPair.transactionId}']`);
    await matchedRow.getByRole("button", { name: /Show stored proposal/ }).click();
    await matchedRow.getByRole("button", { name: "Undo reconciliation" }).click();
    await expect(page.getByTestId("reconciliation-action-success")).toContainText("Reconciliation undone");

    await page.goto(route);
    await page.waitForLoadState("domcontentloaded");
    await waitForHydration(page);
    const rejectRow = page.locator(`[data-worklist-row='${rejectPair.transactionId}']`);
    await rejectRow.getByRole("button", { name: /Show stored proposal/ }).click();
    await rejectRow.getByRole("button", { name: "Reject this proposal" }).click();
    await page.getByRole("dialog", { name: "Reject this proposal?" }).getByRole("button", { name: "Reject this proposal" }).click();
    await expect(page.getByTestId("reconciliation-action-success")).toContainText("Proposal rejected");

    const ignoredRow = page.locator(`[data-worklist-row='${ignoreLine.transactionId}']`);
    await ignoredRow.getByRole("button", { name: "Ignore line" }).click();
    await page.getByRole("dialog", { name: "Ignore this bank line?" }).getByRole("button", { name: "Ignore line" }).click();
    await expect(page.getByTestId("reconciliation-action-success")).toContainText("Bank line ignored");
    await page.goto(`${route}?status=ignored`);
    await page.waitForLoadState("domcontentloaded");
    await waitForHydration(page);
    const restoredRow = page.locator(`[data-worklist-row='${ignoreLine.transactionId}']`);
    await restoredRow.getByRole("button", { name: "Restore line" }).click();
    await expect(page.getByTestId("reconciliation-action-success")).toContainText("Bank line restored");

    const screenshotPath = testInfo.outputPath("banking-reconciliation-live-actions.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    await testInfo.attach("banking reconciliation live actions", { path: screenshotPath, contentType: "image/png" });
  });

  test("renders a localized conflict and offers a reload without removing the row", async ({ page, request, context, baseURL }) => {
    const live = liveApiConfig();
    if (!live) {
      test.skip(true, "Requires OPENERP_API_URL, OPENERP_DEV_ORG_ID, and OPENERP_DEV_USER_ID.");
      return;
    }
    const pair = await createPair(request, live, `conflict-${Date.now()}`);
    await setLocale(page, context, baseURL, "en");
    const row = page.locator(`[data-worklist-row='${pair.transactionId}']`);
    await row.getByRole("button", { name: /Show stored proposal/ }).click();
    const linkId = await row.locator("input[name='linkId']").first().inputValue();
    await postJson(request, live, `/banking/reconciliation/${linkId}/confirm`);
    await row.getByRole("button", { name: "Reject this proposal" }).click();
    await page.getByRole("dialog", { name: "Reject this proposal?" }).getByRole("button", { name: "Reject this proposal" }).click();
    await expect(page.getByTestId("reconciliation-action-error")).toContainText("Worklist changed");
    await expect(page.getByRole("button", { name: "Reload worklist" })).toBeVisible();
    await expect(row).toBeVisible();
  });
});
