# Project Margin Alerts Agent

## Evidence

- Internal OpenERP reference: `docs/study/12-agentic/agents-by-use-case.md`, section "Margin And Delivery Alerting", checked 2026-05-11, used as the main evidence for scheduled margin-risk detection and human handoff.
- Internal OpenERP reference: `docs/study/06-functional-map/agentic-functional-map.md`, sections "Time Entry Review Agent" and "Delivery Status Summary Agent", used as functional references for project time, status, blockers, and customer update context.
- Functional references only: Inngest Agent Kit (Apache-2.0, checked 2026-05-11), OpenInference (Apache-2.0, checked 2026-05-11), and Cedar (Apache-2.0, checked 2026-05-11), cited in the use-case research for scheduled execution, observability conventions, and entity authorization.
- Public benchmark only: Campfire Series A article 2025-06-30; Auditoria finance agents announcement 2025-08-26; ThoughtSpot agents product page 2025. These sources validate finance and delivery alerting demand without authorizing dashboards, thresholds, or analytical wording.

## Business Outcome

The agent helps service teams protect project margin by detecting overruns, unapproved time, delayed invoicing, unresolved blockers, and scope drift early enough for corrective action. The business value is fewer late surprises, faster internal escalation, and clearer linkage between delivery status, time entries, and billing readiness.

## Agent Mode

Primary mode is autonomous event-driven or scheduled, using a service-principal identity for read-heavy checks within tenant policy. Workflow-typed mode applies at milestone, invoice-readiness, and project review gates. Conversational mode lets a project manager, finance user, or account owner drill into the alert and decide the next action.

## Trigger

Triggers include a scheduled project margin review, time entry approval, milestone completion, invoice draft delay, budget threshold crossing, open blocker aging, scope-change note, or manager request from a project dashboard.

## Tools Required (Concept Level)

- Project budget, contract, milestone, and estimate reader contracts.
- Approved and pending time entry reader contracts.
- Invoice status, billing schedule, and revenue recognition context reader contracts.
- Delivery blocker, task aging, decision, and change-note reader contracts.
- Margin alert proposal contract with evidence, impacted object, and suggested owner.
- Internal notification, escalation, and review task contracts.
- Policy contract for threshold configuration, audience, schedule window, and financial visibility.
- Audit event contract recording trigger, evidence, policy result, human decision, and closure outcome.

## Supervision And Human Handoff

The agent can create internal alerts and review tasks, but it cannot change budget, invoice status, project commitments, or customer communication. Project managers handle delivery actions, finance users validate billing impact, and account owners approve customer-facing escalation. High-impact alerts route to a named manager before any external action.

## Bilingual FR EN Requirements

Internal alerts must be available in French and English, with the recipient's language preference used for notification. Customer-facing drafts are outside the default action set and require separate human approval in the customer language. Currency, dates, percentages, and project terminology must follow tenant locale and object context.

## Success Metrics

- Alert latency after margin-impacting event.
- Unapproved time volume at invoice-readiness review.
- Invoice delay count tied to project exceptions.
- Scope drift escalation count.
- Closure rate for margin review tasks.
- Reduction in late billing corrections after project review.

## Risks

- Poor thresholds can create noise or miss real margin deterioration.
- Read-heavy finance visibility requires strict permission and role checks.
- Alerts can be mistaken for final finance decisions.
- Project teams may dispute whether an overrun is delivery, scope, or commercial responsibility.
- Public finance benchmarks expose dashboard language and examples that must not be reused.

## Anti-Copy Notes

No proprietary finance dashboard, alert threshold, prompt text, demo scenario, screenshot, product naming, analytical phrase, or workflow expression may be reused. OpenERP alerts must be derived from OpenERP project, time, billing, and policy contracts. External sources remain functional references or public benchmarks only.

## OpenERP Takeaways

- Margin protection is a strong autonomous scheduled use case, but only for internal alerting.
- Tie every alert to evidence from time, project, billing, and blocker records.
- Keep customer-facing and accounting actions behind explicit human approval.
- The MVP slice should start with scheduled read-only review plus manager-owned closure tasks.
