import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Migration 0009 (AGT-D-08 hygiene): align audit_events agentic columns on
// shared-entities-v1 Article 2.2 — text -> uuid with FKs to the canon tables
// landed in migration 0008.
const migration = readFileSync("src/db/migrations/0009_audit_events_canon_alignment.sql", "utf8");

describe("audit_events canon alignment (AGT-D-08)", () => {
  it("retypes agent_id, tool_call_id, policy_decision_id, delegation_id from text to uuid", () => {
    for (const column of [
      "agent_id",
      "tool_call_id",
      "policy_decision_id",
      "delegation_id"
    ]) {
      const re = new RegExp(
        `alter\\s+table\\s+audit_events\\s+alter\\s+column\\s+${column}\\s+type\\s+uuid\\b`,
        "i"
      );
      expect(migration).toMatch(re);
    }
  });

  it("adds FKs from audit_events to the canon agentic tables", () => {
    expect(migration).toMatch(/audit_events_agent_id_fkey\b/);
    expect(migration).toMatch(/audit_events_agent_run_id_fkey\b/);
    expect(migration).toMatch(/audit_events_tool_call_id_fkey\b/);
    expect(migration).toMatch(/audit_events_policy_decision_id_fkey\b/);
    expect(migration).toMatch(/references\s+agent_definitions\(id\)/i);
    expect(migration).toMatch(/references\s+agent_runs\(id\)/i);
    expect(migration).toMatch(/references\s+tool_calls\(id\)/i);
    expect(migration).toMatch(/references\s+policy_decisions\(id\)/i);
  });

  it("leaves delegation_id without a FK (canon: identifier of the delegation chain only)", () => {
    expect(migration).not.toMatch(/audit_events_delegation_id_fkey/);
  });
});
