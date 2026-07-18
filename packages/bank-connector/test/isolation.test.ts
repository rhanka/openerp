import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { StpConnectorContext } from "../src/fdx.js";
import {
  LIST_ACCOUNTS_INPUT_SHAPE,
  LIST_TRANSACTIONS_INPUT_SHAPE,
  resolveServerContext,
} from "../src/mcp-server.js";
import type { PlaidFetch } from "../src/providers/plaid-sandbox.js";
import { createPlaidSandboxProvider } from "../src/providers/plaid-sandbox.js";

// C1 isolation: two tenant-scoped provider instances must never share an access_token.
// A canned fetch records which access_token reached /accounts/get, and counts enrollments,
// so the test proves per-instance token cache with zero shared module state — no network.

/**
 * Builds a full StpConnectorContext for a given tenant (mirrors mcp-platform runtime §4.5, see
 * fdx.ts). Only `tenantRef` varies across tests here — the rest is fixed test scaffolding.
 */
function makeContext(tenantRef: string): StpConnectorContext {
  return {
    requestId: randomUUID(),
    principal: { sub: "test", tenantRef, roles: [] },
    session: { mcpSessionId: "test-session", clientId: "test-client", source: "claude-code" },
    tenantRef,
    consentRefs: [],
    getSecret: async () => {
      throw new Error("getSecret is not exercised by this test");
    },
  };
}

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
      const accessToken = String(body.access_token);
      probe.accountsGetTokens.push(accessToken);
      // Embed the access_token in the returned account name so tests can assert, on the actual
      // returned data (not just on internal token bookkeeping), that one tenant's provider never
      // surfaces data fetched with another tenant's token.
      return { json: async () => ({ accounts: [{ account_id: "a1", name: `Cheques (${accessToken})`, type: "depository", subtype: "checking", balances: { iso_currency_code: "CAD", current: 100 } }] }) };
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

    await providerA.listAccounts({ tenant: makeContext("org-A") });
    await providerB.listAccounts({ tenant: makeContext("org-B") });
    await providerA.listAccounts({ tenant: makeContext("org-A") });

    // Each instance enrolled exactly once (own cache), so two enrollments total.
    expect(probe.enrollments).toBe(2);
    // org-A used access-1 on both its calls; org-B used access-2; never crossed.
    expect(probe.accountsGetTokens).toEqual(["access-1", "access-2", "access-1"]);
  });

  it("does not retain token state across separately constructed instances", async () => {
    const probe = makeFakeFetch();
    const first = createPlaidSandboxProvider({ fetchImpl: probe.fetchImpl });
    await first.listAccounts({ tenant: makeContext("org-A") });

    // A brand-new instance must enroll again — proving no module-global cache survives.
    const second = createPlaidSandboxProvider({ fetchImpl: probe.fetchImpl });
    await second.listAccounts({ tenant: makeContext("org-A") });

    expect(probe.enrollments).toBe(2);
  });

  it("negative isolation: a context for org-B must never be able to read org-A's data", async () => {
    const probe = makeFakeFetch();
    const providerA = createPlaidSandboxProvider({ fetchImpl: probe.fetchImpl });
    const providerB = createPlaidSandboxProvider({ fetchImpl: probe.fetchImpl });

    const resultA = await providerA.listAccounts({ tenant: makeContext("org-A") });
    const resultB = await providerB.listAccounts({ tenant: makeContext("org-B") });

    // Assert on the actual data returned to each tenant-scoped provider (not just on internal
    // token bookkeeping): org-B's result must not contain anything fetched with org-A's token,
    // and vice versa — the two results are disjoint.
    expect(resultA[0]?.name).not.toEqual(resultB[0]?.name);
    expect(resultB.some((account) => account.name === resultA[0]?.name)).toBe(false);
    expect(resultA.some((account) => account.name === resultB[0]?.name)).toBe(false);
  });
});

describe("ARCH-11: the client cannot choose the tenant", () => {
  it("bank_list_accounts tool input schema has no tenantId field", () => {
    expect(Object.keys(LIST_ACCOUNTS_INPUT_SHAPE)).not.toContain("tenantId");
  });

  it("bank_list_transactions tool input schema has no tenantId field", () => {
    expect(Object.keys(LIST_TRANSACTIONS_INPUT_SHAPE)).not.toContain("tenantId");
  });

  it("resolveServerContext takes zero arguments — no channel exists for a client to set the tenant", () => {
    // A client-controllable tenant would require resolveServerContext to accept an argument (as
    // contextFromInput(tenantId) used to). Its arity is 0: there is nothing a tool caller can pass.
    expect(resolveServerContext.length).toBe(0);
  });

  it("resolveServerContext derives tenantRef from server config/env, never from a caller-supplied value", () => {
    const original = process.env.STP_TENANT_REF;
    try {
      delete process.env.STP_TENANT_REF;
      expect(resolveServerContext().tenantRef).toBe("local");

      process.env.STP_TENANT_REF = "org-configured-server-side";
      expect(resolveServerContext().tenantRef).toBe("org-configured-server-side");
      expect(resolveServerContext().principal.tenantRef).toBe("org-configured-server-side");
    } finally {
      if (original === undefined) {
        delete process.env.STP_TENANT_REF;
      } else {
        process.env.STP_TENANT_REF = original;
      }
    }
  });
});
