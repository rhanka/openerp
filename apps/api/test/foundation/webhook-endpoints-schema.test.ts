import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Migration 0033 (Webhook DS 5.5 — WebhookEndpoint + WebhookDelivery,
// shared-entities-v1 Article 4.5). Tenant-scoped, deleted_at, RLS, indexes.
const migration = readFileSync(
  "src/db/migrations/0033_webhook_endpoints_deliveries.sql",
  "utf8"
);

describe("webhook_endpoints + webhook_deliveries migration (DS 5.5)", () => {
  it("creates the webhook_endpoints table tenant-scoped", () => {
    expect(migration).toContain("create table webhook_endpoints");
    const start = migration.indexOf("create table webhook_endpoints");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    expect(block).toContain("organization_id uuid not null references organizations(id)");
  });

  it("enforces canonical WebhookEndpoint columns", () => {
    const start = migration.indexOf("create table webhook_endpoints");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    for (const column of [
      "owner_user_id uuid references users(id)",
      "name text not null",
      "target_url text not null check (target_url like 'https://%')",
      "signing_secret text not null",
      "event_types jsonb not null default '[]'",
      "is_active boolean not null default true",
      "is_shared boolean not null default false",
      "consecutive_failures integer not null default 0",
      "disabled_at timestamptz",
      "deleted_at timestamptz",
      "created_at timestamptz not null default now()",
      "updated_at timestamptz not null default now()"
    ]) {
      expect(block, `missing column: ${column}`).toContain(column);
    }
  });

  it("creates the webhook_deliveries table tenant-scoped", () => {
    expect(migration).toContain("create table webhook_deliveries");
    const start = migration.indexOf("create table webhook_deliveries");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    expect(block).toContain("organization_id uuid not null references organizations(id)");
    expect(block).toContain(
      "webhook_endpoint_id uuid not null references webhook_endpoints(id)"
    );
  });

  it("enforces canonical WebhookDelivery columns", () => {
    const start = migration.indexOf("create table webhook_deliveries");
    const end = migration.indexOf(");", start);
    const block = migration.slice(start, end);
    for (const column of [
      "event_type text not null",
      "trigger_audit_event_id uuid",
      "payload jsonb not null",
      "signature text not null",
      "status text not null default 'pending_egress'",
      "http_status integer",
      "attempt_count integer not null default 0",
      "next_retry_at timestamptz",
      "error_detail text",
      "signed_at timestamptz not null default now()",
      "delivered_at timestamptz",
      "created_at timestamptz not null default now()"
    ]) {
      expect(block, `missing column: ${column}`).toContain(column);
    }
  });

  it("checks delivery status constraint", () => {
    expect(migration).toContain(
      "check (status in ('pending_egress', 'succeeded', 'failed'))"
    );
  });

  it("creates idempotency unique index on webhook_deliveries", () => {
    expect(migration).toContain("create unique index webhook_deliveries_idempotency_idx");
    expect(migration).toContain("webhook_endpoint_id, trigger_audit_event_id");
    expect(migration).toContain("where trigger_audit_event_id is not null");
  });

  it("creates org+endpoint index on webhook_deliveries", () => {
    expect(migration).toMatch(
      /create\s+index\s+webhook_deliveries_org_endpoint_idx\s+on\s+webhook_deliveries\s*\(\s*organization_id\s*,\s*webhook_endpoint_id\s*\)/i
    );
  });

  it("creates org+active index on webhook_endpoints (where not deleted)", () => {
    expect(migration).toContain("create index webhook_endpoints_org_active_idx");
    expect(migration).toContain("where deleted_at is null");
  });

  it("enables and forces RLS on webhook_endpoints via the tenant pattern", () => {
    const hasDynamic =
      migration.includes("'webhook_endpoints'") &&
      /'alter table %I enable row level security'/i.test(migration);
    expect(hasDynamic, "webhook_endpoints enable RLS").toBe(true);

    const hasSelectPolicy = /create policy %I_tenant_select on %I/i.test(migration);
    expect(hasSelectPolicy, "webhook_endpoints select policy").toBe(true);
  });

  it("enables and forces RLS on webhook_deliveries via the tenant pattern", () => {
    const hasDynamic =
      migration.includes("'webhook_deliveries'") &&
      /'alter table %I enable row level security'/i.test(migration);
    expect(hasDynamic, "webhook_deliveries enable RLS").toBe(true);
  });
});
