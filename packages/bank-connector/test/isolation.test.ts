import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { PlaidFetch } from "../src/providers/plaid-sandbox.js";
import { createPlaidSandboxProvider } from "../src/providers/plaid-sandbox.js";

// C1 isolation: two tenant-scoped provider instances must never share an access_token.
// A canned fetch records which access_token reached /accounts/get, and counts enrollments,
// so the test proves per-instance token cache with zero shared module state — no network.

interface FakeFetchProbe {
  fetchImpl: PlaidFetch;
  enrollments: number;
  accountsGetTokens: string[];
}

function makeFakeFetch(): FakeFetchProbe {
  const probe: FakeFetchProbe = { fetchImpl: undefined as unknown as PlaidFetch, enrollments: 0, accountsGetTokens: [] };
  let issued = 0;

  probe.fetchImpl = async (url, init) => {
    const body = JSON.parse(init.body) as Record<string, unknown>;
    if (url.endsWith("/institutions/search")) {
      return { json: async () => ({ institutions: [{ institution_id: "ins_1", name: "Fake Bank", products: ["transactions"] }] }) };
    }
    if (url.endsWith("/sandbox/public_token/create")) {
      return { json: async () => ({ public_token: `pub-${(issued += 1)}` }) };
    }
    if (url.endsWith("/item/public_token/exchange")) {
      probe.enrollments += 1;
      return { json: async () => ({ access_token: `access-${probe.enrollments}`, item_id: `item-${probe.enrollments}` }) };
    }
    if (url.endsWith("/accounts/get")) {
      probe.accountsGetTokens.push(String(body.access_token));
      return { json: async () => ({ accounts: [{ account_id: "a1", name: "Cheques", type: "depository", subtype: "checking", balances: { iso_currency_code: "CAD", current: 100 } }] }) };
    }
    throw new Error(`unexpected url ${url}`);
  };

  return probe;
}

beforeAll(() => {
  process.env.PLAID_CLIENT_ID = "test-client";
  process.env.PLAID_SANDBOX_SECRET = "test-secret";
});

afterAll(() => {
  delete process.env.PLAID_CLIENT_ID;
  delete process.env.PLAID_SANDBOX_SECRET;
});

describe("plaid-sandbox tenant isolation (C1)", () => {
  it("gives each provider instance its own access_token; no cross-tenant leak", async () => {
    const probe = makeFakeFetch();
    const providerA = createPlaidSandboxProvider({ fetchImpl: probe.fetchImpl });
    const providerB = createPlaidSandboxProvider({ fetchImpl: probe.fetchImpl });

    await providerA.listAccounts({ tenant: { tenantId: "org-A" } });
    await providerB.listAccounts({ tenant: { tenantId: "org-B" } });
    await providerA.listAccounts({ tenant: { tenantId: "org-A" } });

    // Each instance enrolled exactly once (own cache), so two enrollments total.
    expect(probe.enrollments).toBe(2);
    // org-A used access-1 on both its calls; org-B used access-2; never crossed.
    expect(probe.accountsGetTokens).toEqual(["access-1", "access-2", "access-1"]);
  });

  it("does not retain token state across separately constructed instances", async () => {
    const probe = makeFakeFetch();
    const first = createPlaidSandboxProvider({ fetchImpl: probe.fetchImpl });
    await first.listAccounts({ tenant: { tenantId: "org-A" } });

    // A brand-new instance must enroll again — proving no module-global cache survives.
    const second = createPlaidSandboxProvider({ fetchImpl: probe.fetchImpl });
    await second.listAccounts({ tenant: { tenantId: "org-A" } });

    expect(probe.enrollments).toBe(2);
  });
});
