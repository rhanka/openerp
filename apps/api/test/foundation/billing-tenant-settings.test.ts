import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import type { TenantSettings } from "@sentropic/openerp-domain";

import type { Queryable } from "../../src/db/client";
import {
  findTenantSettings,
  updateTenantIssuerSettings
} from "../../src/foundation/tenant-settings";

const migration = readFileSync(
  "src/db/migrations/0038_billing_issuer_tenant_settings.sql",
  "utf8"
);

const TENANT = { organizationId: "org-1", actorUserId: "user-1" };
const settings: TenantSettings = {
  organizationId: TENANT.organizationId,
  supportedLocales: ["en", "fr"],
  primaryLocale: "fr",
  taxRegion: "CA-QC",
  fiscalYearStart: "01-01",
  documentNumberingPolicy: "{}",
  retentionPolicy: "{}",
  selfHostedUpdateState: {
    currentVersion: "0.2.0",
    latestSupportedVersion: "0.2.0",
    supportWindow: "under_12_months",
    preflightRequired: false
  },
  gstRegistrationNumber: null,
  qstRegistrationNumber: null,
  issuerAddress: null
};

describe("billing issuer tenant settings migration (0038)", () => {
  it("adds nullable issuer registration and address columns additively", () => {
    expect(migration).toContain("alter table tenant_settings");
    expect(migration).toContain("add column gst_registration_number text");
    expect(migration).toContain("add column qst_registration_number text");
    expect(migration).toContain("add column issuer_address jsonb");
    expect(migration).not.toMatch(/create\s+table\s+tenant_settings/i);
    expect(migration).not.toMatch(/add\s+column[^;]+not\s+null/i);
  });
});

describe("tenant settings repository", () => {
  it("reads issuer registration and address fields tenant-scoped", async () => {
    let queryText = "";
    let queryValues: unknown[] = [];
    const db: Queryable = {
      async query<T>(text: string, values: unknown[] = []) {
        queryText = text;
        queryValues = values;
        return { rows: [settings as T] };
      }
    };

    await expect(findTenantSettings(db, TENANT)).resolves.toEqual(settings);
    expect(queryText).toContain('gst_registration_number as "gstRegistrationNumber"');
    expect(queryText).toContain('qst_registration_number as "qstRegistrationNumber"');
    expect(queryText).toContain('issuer_address as "issuerAddress"');
    expect(queryValues).toEqual([TENANT.organizationId]);
  });

  it("writes issuer registration and address fields tenant-scoped", async () => {
    let queryText = "";
    let queryValues: unknown[] = [];
    const issuerAddress = {
      line1: "123 rue Exemple",
      city: "Montréal",
      provinceState: "QC",
      postalCode: "H2X 1Y4",
      country: "CA"
    };
    const db: Queryable = {
      async query<T>(text: string, values: unknown[] = []) {
        queryText = text;
        queryValues = values;
        return {
          rows: [{
            ...settings,
            gstRegistrationNumber: "123456789RT0001",
            qstRegistrationNumber: "1234567890TQ0001",
            issuerAddress
          } as T]
        };
      }
    };

    const updated = await updateTenantIssuerSettings(db, TENANT, {
      gstRegistrationNumber: "123456789RT0001",
      qstRegistrationNumber: "1234567890TQ0001",
      issuerAddress
    });

    expect(updated?.issuerAddress).toEqual(issuerAddress);
    expect(queryText).toContain("update tenant_settings");
    expect(queryText).toContain("gst_registration_number = $2");
    expect(queryText).toContain("qst_registration_number = $3");
    expect(queryText).toContain("issuer_address = $4");
    expect(queryValues).toEqual([
      TENANT.organizationId,
      "123456789RT0001",
      "1234567890TQ0001",
      issuerAddress
    ]);
  });
});
