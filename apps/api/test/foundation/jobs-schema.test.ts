import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("src/db/migrations/0005_jobs.sql", "utf8");

describe("jobs migration (PG-04, Lot 4)", () => {
  it("creates the jobs table with required columns", () => {
    expect(migration).toContain("create table jobs");
    for (const col of [
      "organization_id uuid not null",
      "job_type text not null",
      "payload jsonb not null",
      "status text not null check (status in",
      "attempts integer not null default 0",
      "idempotency_key text",
      "scheduled_at timestamptz not null",
      "started_at timestamptz",
      "completed_at timestamptz",
      "last_error text"
    ]) {
      expect(migration).toContain(col);
    }
  });

  it("enforces tenant-scope idempotency on (organization_id, idempotency_key)", () => {
    expect(migration).toContain("unique (organization_id, idempotency_key)");
  });

  it("enables RLS and registers tenant policies", () => {
    expect(migration).toContain("alter table jobs enable row level security");
    expect(migration).toContain("organization_id = app_current_organization_id()");
  });

  it("indexes for the worker dequeue path (status=queued)", () => {
    expect(migration).toContain("jobs_status_scheduled_idx");
    expect(migration).toContain("where status = 'queued'");
  });
});
