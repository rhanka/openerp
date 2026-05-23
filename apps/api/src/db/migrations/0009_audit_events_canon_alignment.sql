-- Audit canon alignment (AGT-D-08, shared-entities-v1 Article 2.2).
-- Earlier migrations stored agentic identifiers on audit_events as text. The
-- canon defines them as UUIDs with FKs to the agentic tables introduced in
-- 0008. All existing audit rows have NULL for these columns (no agent run yet
-- in dev / CI), so the type cast is lossless.
--
-- Postgres 16 supports ALTER TYPE on a RANGE-partitioned parent: the change
-- cascades to every partition. Foreign keys can be added on a partitioned
-- parent referencing a regular table.

alter table audit_events
  alter column agent_id type uuid using agent_id::uuid;

alter table audit_events
  alter column tool_call_id type uuid using tool_call_id::uuid;

alter table audit_events
  alter column policy_decision_id type uuid using policy_decision_id::uuid;

alter table audit_events
  alter column delegation_id type uuid using delegation_id::uuid;

alter table audit_events
  add constraint audit_events_agent_id_fkey
  foreign key (agent_id) references agent_definitions(id);

alter table audit_events
  add constraint audit_events_agent_run_id_fkey
  foreign key (agent_run_id) references agent_runs(id);

alter table audit_events
  add constraint audit_events_tool_call_id_fkey
  foreign key (tool_call_id) references tool_calls(id);

alter table audit_events
  add constraint audit_events_policy_decision_id_fkey
  foreign key (policy_decision_id) references policy_decisions(id);
