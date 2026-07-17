import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Migration 0040 (email_sends journal — D6, owner-ratified in
// docs/studies/2026-07-11-wave-replacement-decisions.md).
const migration = readFileSync("src/db/migrations/0040_foundation_email_sends.sql", "utf8");

describe("email_sends migration (D6)", () => {
  it("creates the email_sends table tenant-scoped", () => {
    expect(migration).toContain("create table email_sends");
    const start = migration.indexOf("create table email_sends");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    expect(block).toContain("organization_id uuid not null references organizations(id)");
  });

  it("enforces canonical EmailSend columns from the spec", () => {
    const start = migration.indexOf("create table email_sends");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    for (const column of [
      "id uuid primary key default gen_random_uuid()",
      "to_address text not null",
      "subject text not null",
      "kind text not null",
      "resource_type text",
      "resource_id uuid",
      "status text not null default 'queued'",
      "provider text not null",
      "idempotency_key text not null",
      "error text",
      "sent_at timestamptz",
      "created_at timestamptz not null default now()",
      "updated_at timestamptz not null default now()"
    ]) {
      expect(block, `missing column: ${column}`).toContain(column);
    }
  });

  it("constrains status to the allowed values", () => {
    expect(migration).toMatch(/check\s*\(\s*status\s+in\s*\('queued'\s*,\s*'sent'\s*,\s*'failed'\s*\)\s*\)/i);
  });

  it("enforces unique (organization_id, idempotency_key)", () => {
    expect(migration).toContain("unique (organization_id, idempotency_key)");
  });

  it("indexes email_sends by (organization_id, status)", () => {
    expect(migration).toMatch(
      /create\s+index\s+email_sends_org_status_idx\s+on\s+email_sends\s*\(\s*organization_id\s*,\s*status\s*\)/i
    );
  });

  it("enables and forces RLS via the do-block pattern for email_sends", () => {
    expect(migration).toContain("'email_sends'");
    expect(migration).toMatch(/'alter table %I enable row level security'/i);
    expect(migration).toMatch(/'alter table %I force row level security'/i);
    expect(migration).toMatch(
      /'create policy %I_tenant_select on %I for select using \(organization_id = app_current_organization_id\(\)\)'/i
    );
    expect(migration).toMatch(
      /'create policy %I_tenant_modify on %I for all using \(organization_id = app_current_organization_id\(\)\) with check \(organization_id = app_current_organization_id\(\)\)'/i
    );
  });
});
