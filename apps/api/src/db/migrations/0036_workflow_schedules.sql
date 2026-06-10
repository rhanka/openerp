-- Workflow cadence scheduling columns (AUTOMATION-RUNTIME A0-4).
-- Adds schedule-aware columns to workflow_definitions so that workflows
-- can be triggered on a recurring cadence (cron / calendar interval).
-- Extends the workflow_runs.triggered_by constraint to allow 'schedule'.

alter table workflow_definitions
  add column cadence text,
  add column timezone text default 'UTC',
  add column next_run_at timestamptz,
  add column last_run_at timestamptz;

create index workflow_definitions_next_run_idx
  on workflow_definitions (next_run_at)
  where cadence is not null and next_run_at is not null;

-- The original constraint in 0032 uses: check (triggered_by in ('event', 'manual'))
-- We need to extend it to also allow 'schedule'. Drop the old constraint by its
-- inferred name (PostgreSQL auto-generates it as <table>_triggered_by_check),
-- then add the new one with the full value set.
alter table workflow_runs
  drop constraint if exists workflow_runs_triggered_by_check;

alter table workflow_runs
  add constraint workflow_runs_triggered_by_check
  check (triggered_by in ('event', 'manual', 'schedule'));
