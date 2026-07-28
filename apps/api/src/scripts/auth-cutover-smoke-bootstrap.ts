/* eslint-disable no-console */
import process from "node:process";

import type { ClientQueryable } from "../db/pg-client.js";
import { createPgPool } from "../db/pg-client.js";

interface SmokeIdentity {
  email: string;
  organizationId: string;
  userId: string;
}

interface SmokeFixture {
  multi: SmokeIdentity & { rejectedOrganizationId: string; secondaryOrganizationId: string };
  single: SmokeIdentity;
}

const DEV_EMAIL_DOMAIN = "openerp-dev.invalid";

async function main(): Promise<void> {
  const databaseUrl = process.env.OPENERP_DATABASE_URL;
  const runId = normalizeRunId(process.env.OPENERP_AUTH_SMOKE_RUN_ID);
  if (!databaseUrl) throw new Error("OPENERP_DATABASE_URL is required for the DEV auth smoke bootstrap.");

  const pool = createPgPool({ connectionString: databaseUrl });
  try {
    const fixture = await pool.withClient(async (client) => {
      await client.query("begin");
      try {
        const value = await createFixture(client, runId);
        await client.query("commit");
        return value;
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    });
    process.stdout.write(`${JSON.stringify(fixture)}\n`);
  } finally {
    await pool.end();
  }
}

async function createFixture(client: ClientQueryable, runId: string): Promise<SmokeFixture> {
  const singleOrganizationId = await ensureOrganization(client, `auth-smoke-single-${runId}`, "Auth smoke single");
  const multiPrimaryOrganizationId = await ensureOrganization(client, `auth-smoke-multi-primary-${runId}`, "Auth smoke multi primary");
  const multiSecondaryOrganizationId = await ensureOrganization(client, `auth-smoke-multi-secondary-${runId}`, "Auth smoke multi secondary");

  const single = await createInvitedIdentity(client, {
    email: `auth-smoke-single+${runId}@${DEV_EMAIL_DOMAIN}`,
    organizationIds: [singleOrganizationId],
  });
  const multi = await createInvitedIdentity(client, {
    email: `auth-smoke-multi+${runId}@${DEV_EMAIL_DOMAIN}`,
    organizationIds: [multiPrimaryOrganizationId, multiSecondaryOrganizationId],
  });

  return {
    single: { ...single, organizationId: singleOrganizationId },
    multi: {
      ...multi,
      organizationId: multiPrimaryOrganizationId,
      secondaryOrganizationId: multiSecondaryOrganizationId,
      // A well-formed UUID avoids testing only input validation: the host
      // must re-check that it is an active membership before issuing a token.
      rejectedOrganizationId: "00000000-0000-4000-8000-000000000001",
    },
  };
}

async function ensureOrganization(client: ClientQueryable, slug: string, displayName: string): Promise<string> {
  const existing = await client.query<{ id: string }>("select id from organizations where slug = $1", [slug]);
  if (existing.rows[0]) return existing.rows[0].id;

  const result = await client.query<{ id: string }>(
    `insert into organizations (
       legal_name, display_name, slug, status, default_locale, default_currency,
       default_timezone, country, province_state
     ) values ($1, $2, $3, 'active', 'en', 'CAD', 'America/Toronto', 'CA', 'QC')
     returning id`,
    [`${displayName} Inc.`, displayName, slug],
  );
  const organizationId = result.rows[0]?.id;
  if (!organizationId) throw new Error(`Could not create smoke organization ${slug}.`);
  return organizationId;
}

async function createInvitedIdentity(
  client: ClientQueryable,
  input: { email: string; organizationIds: string[] },
): Promise<Omit<SmokeIdentity, "organizationId">> {
  const identity = await client.query<{ id: string }>(
    `insert into user_identities (
       email, display_name, preferred_locale, mfa_state, status, actor_type, email_verified
     ) values ($1, 'OpenERP auth smoke', 'en', 'not_configured', 'invited', 'human', false)
     on conflict (email) do update
       set display_name = excluded.display_name,
           mfa_state = 'not_configured',
           status = 'invited',
           actor_type = 'human',
           email_verified = false,
           updated_at = now()
     returning id`,
    [input.email],
  );
  const userId = identity.rows[0]?.id;
  if (!userId) throw new Error(`Could not create smoke identity ${input.email}.`);

  for (const organizationId of input.organizationIds) {
    await client.query(
      `insert into organization_members (user_identity_id, organization_id, status, preferred_locale)
       values ($1, $2, 'active', 'en')
       on conflict (user_identity_id, organization_id) do update
         set status = 'active', preferred_locale = 'en', updated_at = now()`,
      [userId, organizationId],
    );
  }
  return { email: input.email, userId };
}

function normalizeRunId(value: string | undefined): string {
  if (!value) throw new Error("OPENERP_AUTH_SMOKE_RUN_ID is required for a unique DEV smoke fixture.");
  const normalized = value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 40);
  if (!normalized || normalized.startsWith("-") || normalized.endsWith("-")) {
    throw new Error("OPENERP_AUTH_SMOKE_RUN_ID must contain at least one alphanumeric character.");
  }
  return normalized;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
