import { describe, expect, it } from "vitest";

import { buildDeliveryPayload } from "../../src/webhook/webhook-signer";

describe("webhook delivery PII guardrail", () => {
  it("keeps replayable webhook payloads to audit metadata, never provider response fields", () => {
    const syntheticPan = "SYNTHETIC-PAN-4012-8888-8888-1881";
    const syntheticAccountNumber = "SYNTHETIC-ACCOUNT-000123456789";
    const payload = buildDeliveryPayload(
      "banking.bank_transaction.imported",
      "org-synthetic",
      "bank_transaction",
      "transaction-synthetic",
      "audit-synthetic"
    );

    expect(Object.keys(payload).sort()).toEqual([
      "auditEventId",
      "eventType",
      "organizationId",
      "resourceId",
      "resourceType",
      "timestamp"
    ]);
    const serialized = JSON.stringify(payload);
    for (const forbidden of [
      "access_token",
      "account_number",
      "routing_number",
      "official_name",
      "mask",
      syntheticPan,
      syntheticAccountNumber
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});
