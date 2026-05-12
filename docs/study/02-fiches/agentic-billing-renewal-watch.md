# Billing Renewal Watch Agent

## Evidence

- Internal synthesis: `docs/study/12-agentic/agents-by-use-case.md`, checked 2026-05-11, maps Renewal Watch to scheduled detection of approaching renewals and conversational account-owner review. It cites HubSpot Breeze (2025), Gong AI (2025-10), and Workato AI (2025-08-19). Proprietary entries are public benchmark only.
- Functional map: `docs/study/06-functional-map/agentic-functional-map.md`, checked 2026-05-11, defines the Subscription Renewal And Billing Change Agent with contract, billing schedule, renewal draft, and notification concepts. This is OpenERP-written functional reference.
- MVP boundary: `docs/study/07-mvp/mvp-recommendation.md`, checked 2026-05-11, includes recurring billing schedules, renewal notifications, paused or ended contracts, and source-linked invoice drafts.

## Business Outcome

Prevent missed renewals, late billing changes, and customer confusion by surfacing upcoming contract events early. The agent should help account owners prepare renewal actions, finance users confirm billing schedule changes, and managers see revenue leakage risk before it affects invoicing.

## Agent Mode

Autonomous scheduled for renewal windows and billing-change monitoring. Conversational for account-owner review and customer draft preparation. Workflow-typed when a confirmed renewal or amendment updates contract, schedule, or approval state.

## Trigger

- Renewal window approaching.
- Contract amendment added.
- Subscription paused, ended, or reactivated.
- Price list update affecting a recurring schedule.
- Usage threshold or service entitlement event where a regional pack later defines it.

## Tools Required (Concept Level)

- Contract and subscription reader contract with renewal date, term, owner, and status.
- Recurring billing schedule reader and draft update contract.
- Customer timeline reader contract for recent delivery, support, invoice, and decision context.
- Renewal task and approval request contract.
- Customer communication draft contract for supervised FR/EN messages.
- Audit event contract for renewal detection and schedule changes.

## Supervision And Human Handoff

The agent can detect upcoming renewal work, prepare internal summaries, and draft next actions. It cannot change commercial terms, activate a new billing schedule, pause service, or send a customer notice without the sales lead and finance user approvals required by tenant policy.

## Bilingual FR EN Requirements

Internal summaries and customer drafts must be available in French and English. Customer-facing renewal wording must use the customer language and avoid implying acceptance until the account owner approves. Billing schedule labels and approval messages must exist in both languages.

## Success Metrics

- Renewal preparation latency.
- Missed renewal count.
- Billing-change correction count.
- Customer-notice completion.
- Revenue leakage incidents tied to renewal or schedule gaps.

## Risks

- Preparing renewal actions from stale contract or schedule data.
- Confusing renewal notice with approved commercial commitment.
- Exposing contract terms to users outside permission scope.
- Updating billing schedules before finance review.
- Excessive alerts for low-impact renewals.

## Anti-Copy Notes

Do not copy renewal playbooks, sales scripts, lifecycle terminology, prompts, workflow definitions, screenshots, UI catalog surfaces, agent builder flows, policy syntax, sandbox configuration, or external interop catalog naming from benchmarks. OpenERP renewal behavior must be based on its contract, schedule, approval, and audit model.

## OpenERP Takeaways

Renewal watch is valuable because it bridges CRM ownership and billing readiness. Keep it scheduled, explainable, and approval-driven; commercial decisions and billing schedule activation stay with the sales and finance owners.
