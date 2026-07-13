import type {
  TenantIssuerAddress,
  TenantSettings
} from "@sentropic/openerp-domain";

import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";

const TENANT_SETTINGS_RETURN_COLUMNS = `
  organization_id as "organizationId",
  supported_locales as "supportedLocales",
  primary_locale as "primaryLocale",
  tax_region as "taxRegion",
  fiscal_year_start as "fiscalYearStart",
  document_numbering_policy::text as "documentNumberingPolicy",
  retention_policy::text as "retentionPolicy",
  self_hosted_update_state as "selfHostedUpdateState",
  gst_registration_number as "gstRegistrationNumber",
  qst_registration_number as "qstRegistrationNumber",
  issuer_address as "issuerAddress"
`;

export interface UpdateTenantIssuerSettingsInput {
  gstRegistrationNumber: string | null;
  qstRegistrationNumber: string | null;
  issuerAddress: TenantIssuerAddress | null;
}

export async function findTenantSettings(
  db: Queryable,
  context: TenantContext
): Promise<TenantSettings | null> {
  assertTenantContext(context);
  const result = await db.query<TenantSettings>(
    `select ${TENANT_SETTINGS_RETURN_COLUMNS}
       from tenant_settings
      where organization_id = $1`,
    [context.organizationId]
  );
  return result.rows[0] ?? null;
}

export async function updateTenantIssuerSettings(
  db: Queryable,
  context: TenantContext,
  input: UpdateTenantIssuerSettingsInput
): Promise<TenantSettings | null> {
  assertTenantContext(context);
  const result = await db.query<TenantSettings>(
    `update tenant_settings
        set gst_registration_number = $2,
            qst_registration_number = $3,
            issuer_address = $4,
            updated_at = now()
      where organization_id = $1
      returning ${TENANT_SETTINGS_RETURN_COLUMNS}`,
    [
      context.organizationId,
      input.gstRegistrationNumber,
      input.qstRegistrationNumber,
      input.issuerAddress
    ]
  );
  return result.rows[0] ?? null;
}
