# Billing Dunning Agent

## Evidence

- Internal synthesis: `docs/study/12-agentic/agents-by-use-case.md`, checked 2026-05-11, maps Dunning And Payment Follow-Up to scheduled internal draft creation and human approval before sending. It cites Capchase Collect (2024), Auditoria AI (2025), and Ramp AI (2025-07-10). Proprietary entries are public benchmark only.
- Functional map: `docs/study/06-functional-map/agentic-functional-map.md`, checked 2026-05-11, defines Dunning And Payment Follow-Up Agent with autonomous internal reminders, conversational review, and dispute escalation. This is OpenERP-written functional reference.
- MVP boundary: `docs/study/07-mvp/mvp-recommendation.md`, checked 2026-05-11, includes invoice overdue events, failed-payment notifications, payment status, and dunning hooks in the billing MVP surface.

## Business Outcome

Improve time-to-cash by preparing timely, courteous, policy-aware follow-up for overdue invoices while preserving customer relationship context. The agent should reduce missed internal follow-up, flag disputes, and route higher-risk collection decisions to humans.

## Agent Mode

Autonomous event-driven or scheduled for internal reminder creation and overdue monitoring. Conversational for finance review of customer-facing drafts. Workflow-typed when a dispute, promise-to-pay miss, or escalation gate changes the billing workflow state.

## Trigger

- Invoice overdue event.
- Failed payment webhook or manual failed payment status.
- Promise-to-pay date missed.
- Customer dispute note added to an invoice.
- Scheduled aging review.

## Tools Required (Concept Level)

- Invoice aging reader contract with balance, due date, payment status, and dispute state.
- Customer account and contact history reader contract.
- Payment status reader contract for manual payments and provider events.
- Follow-up draft writer contract limited to internal review state.
- Task and escalation queue contract for finance, sales, or account owner handoff.
- Notification and audit event contract for internal reminders and approvals.

## Supervision And Human Handoff

The agent can create internal reminders and customer message drafts. A finance user or account owner must approve any customer-visible message, pause a schedule, mark a dispute path, or escalate to formal collection. High-value invoices, disputed invoices, and customers with active delivery risk always hand off to a human owner.

## Bilingual FR EN Requirements

Customer drafts must follow the customer's preferred French or English language, with finance-visible rationale available in both languages. Internal notifications must show due date, balance, prior contact, and proposed next action in the recipient's preferred language.

## Success Metrics

- Days to payment after overdue trigger.
- Overdue balance movement.
- Approved follow-up count.
- Dispute resolution time.
- Missed promise-to-pay count.

## Risks

- Customer relationship damage from overly aggressive wording.
- Sending a reminder for a disputed or already paid invoice.
- Violating tenant policy on collection thresholds or owner approval.
- Exposing finance details to a user without billing permission.
- Alert fatigue if low-value reminders are too frequent.

## Anti-Copy Notes

Do not reuse collection scripts, reminder cadence names, email templates, prompts, demos, screenshots, workflow recipes, catalog UI, builder UI, policy syntax, sandbox configuration, or external interop catalog naming from any benchmark. OpenERP should define its own courteous FR/EN collection language and escalation rules.

## OpenERP Takeaways

This agent should start as internal assistance plus supervised customer drafting. The useful primitive is not autonomous collection; it is consistent aging context, owner routing, bilingual draft support, and a clear human approval gate before customer contact.
