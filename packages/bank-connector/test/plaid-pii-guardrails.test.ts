import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { connectorFailureLogRecord } from "../src/mcp-server.js";
import {
  redactPlaidSensitiveFields,
  type RedactedPlaidPayload,
} from "../src/providers/plaid-pii.js";
import {
  createPlaidSandboxProvider,
  mapPlaidAccount,
  mapPlaidTransaction,
  type PlaidFetch,
} from "../src/providers/plaid-sandbox.js";

const SYNTHETIC_PAN = "SYNTHETIC-PAN-4012-8888-8888-1881";
const SYNTHETIC_ACCOUNT_NUMBER = "SYNTHETIC-ACCOUNT-000123456789";
const SYNTHETIC_HOLDER_NAME = "Synthetic Holder Only";

const originalClientId = process.env.PLAID_CLIENT_ID;
const originalSecret = process.env.PLAID_SANDBOX_SECRET;

beforeEach(() => {
  process.env.PLAID_CLIENT_ID = "synthetic-client";
  process.env.PLAID_SANDBOX_SECRET = "synthetic-secret";
});

afterEach(() => {
  if (originalClientId === undefined) delete process.env.PLAID_CLIENT_ID;
  else process.env.PLAID_CLIENT_ID = originalClientId;
  if (originalSecret === undefined) delete process.env.PLAID_SANDBOX_SECRET;
  else process.env.PLAID_SANDBOX_SECRET = originalSecret;
});

function providerContext() {
  return { institutionQuery: "Synthetic bank" };
}

describe("Plaid PII guardrails", () => {
  it("logs provider failures as metadata only, never the bank response body", async () => {
    const errorBody = {
      error_code: "ITEM_LOGIN_REQUIRED",
      error_message: `holder=${SYNTHETIC_HOLDER_NAME}; account=${SYNTHETIC_ACCOUNT_NUMBER}; pan=${SYNTHETIC_PAN}`,
      accounts: [{ account_number: SYNTHETIC_ACCOUNT_NUMBER, name: SYNTHETIC_HOLDER_NAME }],
    };
    const fetchImpl: PlaidFetch = async () => ({ json: async () => errorBody });
    const provider = createPlaidSandboxProvider({ fetchImpl });

    let failure: unknown;
    try {
      await provider.listAccounts(providerContext());
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(Error);
    const message = (failure as Error).message;
    expect(message).toBe("plaid /institutions/search failed: ITEM_LOGIN_REQUIRED");
    expect(message).not.toContain(SYNTHETIC_PAN);
    expect(message).not.toContain(SYNTHETIC_ACCOUNT_NUMBER);
    expect(message).not.toContain(SYNTHETIC_HOLDER_NAME);

    const logged = JSON.stringify(connectorFailureLogRecord(failure));
    expect(logged).toContain("ITEM_LOGIN_REQUIRED");
    expect(logged).not.toContain(SYNTHETIC_PAN);
    expect(logged).not.toContain(SYNTHETIC_ACCOUNT_NUMBER);
    expect(logged).not.toContain(SYNTHETIC_HOLDER_NAME);
  });

  it("redacts Plaid credentials and account-holder fields recursively", () => {
    const redacted = redactPlaidSensitiveFields({
      access_token: "synthetic-access-token",
      client_id: "synthetic-client",
      secret: "synthetic-secret",
      accounts: [{
        account_id: "synthetic-account-id",
        account_number: SYNTHETIC_ACCOUNT_NUMBER,
        routing_number: "SYNTHETIC-ROUTING-000",
        mask: "1881",
        official_name: SYNTHETIC_HOLDER_NAME,
        name: SYNTHETIC_HOLDER_NAME,
        balances: { current: 123.45 },
      }],
      error_code: "ITEM_LOGIN_REQUIRED",
    }) as RedactedPlaidPayload;

    expect(redacted.access_token).toBe("[REDACTED]");
    expect(redacted.client_id).toBe("[REDACTED]");
    expect(redacted.secret).toBe("[REDACTED]");
    expect(redacted.accounts).toEqual([{
      account_id: "[REDACTED]",
      account_number: "[REDACTED]",
      routing_number: "[REDACTED]",
      mask: "[REDACTED]",
      official_name: "[REDACTED]",
      name: "[REDACTED]",
      balances: { current: 123.45 },
    }]);
    expect(redacted.error_code).toBe("ITEM_LOGIN_REQUIRED");
  });

  it("returns only the normalized connector contract, never raw provider field names", () => {
    const account = mapPlaidAccount({
      account_id: "synthetic-account-id",
      name: "Synthetic chequing",
      official_name: SYNTHETIC_HOLDER_NAME,
      mask: "1881",
      account_number: SYNTHETIC_ACCOUNT_NUMBER,
      type: "depository",
      subtype: "checking",
      balances: { iso_currency_code: "CAD", current: 123.45 },
    }, "Synthetic institution");
    const transaction = mapPlaidTransaction({
      transaction_id: "synthetic-transaction-id",
      account_id: "synthetic-account-id",
      account_number: SYNTHETIC_ACCOUNT_NUMBER,
      date: "2026-07-01",
      amount: 12.34,
      iso_currency_code: "CAD",
      name: "Synthetic merchant purchase",
      merchant_name: "Synthetic merchant",
      personal_finance_category: { primary: "GENERAL_MERCHANDISE" },
      pending: false,
    });

    const normalized = JSON.stringify({ account, transaction });
    for (const rawField of ["access_token", "account_number", "routing_number", "official_name", "mask"]) {
      expect(normalized).not.toContain(rawField);
    }
    expect(normalized).not.toContain(SYNTHETIC_ACCOUNT_NUMBER);
    expect(normalized).not.toContain(SYNTHETIC_HOLDER_NAME);
    expect(account).toEqual(expect.objectContaining({ id: "synthetic-account-id", providerRef: "synthetic-account-id" }));
    expect(transaction).toEqual(expect.objectContaining({ id: "synthetic-transaction-id", providerRef: "synthetic-transaction-id" }));
  });
});
