import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Migration 0008: agentic entities (Article 4.6 shared-entities-v1) — owned by
// the agentic module surface but defined in the foundation database so the
// existing partitioned audit_events.agent_*/policy_decision_id/approval_request_id
// FKs can resolve.
const migration = readFileSync("src/db/migrations/0008_agentic_entities.sql", "utf8");

describe("agentic entities migration (PG-06 article 4.6)", () => {
  it("creates the five canon tables", () => {
    for (const table of [
      "agent_definitions",
      "agent_runs",
      "tool_calls",
      "policy_decisions",
      "supervision_requests"
    ]) {
      expect(migration).toContain(`create table ${table}`);
    }
  });

  it("scopes every agentic table by organization_id with FK to organizations", () => {
    for (const table of [
      "agent_definitions",
      "agent_runs",
      "tool_calls",
      "policy_decisions",
      "supervision_requests"
    ]) {
      const start = migration.indexOf(`create table ${table}`);
      const end = migration.indexOf(");", start);
      const block = migration.slice(start, end);
      expect(block, `${table} should be tenant-scoped`).toContain(
        "organization_id uuid not null references organizations(id)"
      );
    }
  });

  it("enforces agent_runs status whitelist from Article 3.5", () => {
    expect(migration).toMatch(
      /status\s+text\s+not\s+null[^\n]*check\s*\(\s*status\s+in\s*\(\s*'pending'\s*,\s*'running'\s*,\s*'succeeded'\s*,\s*'failed'\s*,\s*'cancelled'\s*,\s*'awaiting_approval'\s*\)/i
    );
  });

  it("enforces agent_runs mode whitelist (RFC 8693 acting_as / service_principal / on_behalf_of)", () => {
    expect(migration).toMatch(
      /mode\s+text\s+not\s+null[^\n]*check\s*\(\s*mode\s+in\s*\(\s*'acting_as'\s*,\s*'service_principal'\s*,\s*'on_behalf_of'\s*\)/i
    );
  });

  it("enforces policy_decisions decision whitelist (allow|deny|require_approval)", () => {
    expect(migration).toMatch(
      /decision\s+text\s+not\s+null[^\n]*check\s*\(\s*decision\s+in\s*\(\s*'allow'\s*,\s*'deny'\s*,\s*'require_approval'\s*\)/i
    );
  });

  it("enforces tool_calls status whitelist (pending|running|succeeded|failed)", () => {
    expect(migration).toMatch(
      /status\s+text\s+not\s+null[^\n]*check\s*\(\s*status\s+in\s*\(\s*'pending'\s*,\s*'running'\s*,\s*'succeeded'\s*,\s*'failed'\s*\)/i
    );
  });

  it("declares FK chain agent_runs -> agent_definitions and tool_calls/policy_decisions -> agent_runs", () => {
    expect(migration).toMatch(/agent_definition_id\s+uuid\s+not\s+null\s+references\s+agent_definitions\(id\)/i);
    expect(migration).toMatch(/agent_run_id\s+uuid\s+not\s+null\s+references\s+agent_runs\(id\)/i);
  });

  it("links agent_runs to approval_requests and policy_decisions through nullable FKs", () => {
    expect(migration).toMatch(/policy_decision_id\s+uuid\s+references\s+policy_decisions\(id\)/i);
    expect(migration).toMatch(/approval_request_id\s+uuid\s+references\s+approval_requests\(id\)/i);
  });

  it("enables and forces RLS on every agentic table (literal or do-block format())", () => {
    for (const table of [
      "agent_definitions",
      "agent_runs",
      "tool_calls",
      "policy_decisions",
      "supervision_requests"
    ]) {
      const literalEnable = migration.includes(`alter table ${table} enable row level security`);
      const dynamicEnable =
        migration.includes(`'${table}'`) &&
        /'alter table %I enable row level security'/i.test(migration);
      expect(literalEnable || dynamicEnable, `${table} enable RLS`).toBe(true);

      const literalForce = migration.includes(`alter table ${table} force row level security`);
      const dynamicForce =
        migration.includes(`'${table}'`) &&
        /'alter table %I force row level security'/i.test(migration);
      expect(literalForce || dynamicForce, `${table} force RLS`).toBe(true);

      const literalSelect = migration.includes(`create policy ${table}_tenant_select on ${table}`);
      const dynamicSelect =
        migration.includes(`'${table}'`) &&
        /create policy %I_tenant_select on %I/i.test(migration);
      expect(literalSelect || dynamicSelect, `${table} select policy`).toBe(true);

      const literalModify = migration.includes(`create policy ${table}_tenant_modify on ${table}`);
      const dynamicModify =
        migration.includes(`'${table}'`) &&
        /create policy %I_tenant_modify on %I/i.test(migration);
      expect(literalModify || dynamicModify, `${table} modify policy`).toBe(true);
    }
  });
});
