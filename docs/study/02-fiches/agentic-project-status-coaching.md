# Project Status Coaching Agent

## Evidence

- Internal OpenERP reference: `docs/study/06-functional-map/agentic-functional-map.md`, section "Delivery Status Summary Agent", used as functional reference for project history, customer update, supervision, and outcome.
- Internal OpenERP dated research: `docs/study/12-agentic/agents-by-use-case.md`, section "Project Status Coaching", checked 2026-05-11. LangGraph (MIT, checked 2026-05-11), Inngest Agent Kit (Apache-2.0, checked 2026-05-11), and Langfuse core (MIT open-core, checked 2026-05-11) are functional references only for state, event execution, and trace review.
- Public benchmark only: Glean Agents article 2025; Notion Custom Agents release 2026-02-24; Workato AI announcement 2025-08-19. These sources validate project and workspace agent demand without authorizing status labels, templates, or automation recipes.

## Business Outcome

The agent helps project managers detect unclear ownership, stale status, missed customer updates, and delivery blockers before they become customer dissatisfaction or margin loss. It reduces the time needed to prepare status updates while keeping the manager accountable for interpretation and customer communication.

## Agent Mode

Primary mode is conversational when launched from a project, milestone, or manager workspace. Autonomous event-driven or scheduled mode is used for stale status checks, overdue customer-visible updates, and recurring weekly preparation. Workflow-typed mode applies when a status summary is attached to a milestone review, customer portal publication, or executive reporting process.

## Trigger

Triggers include a weekly project update window, milestone change, overdue task, missing owner, customer-visible commitment approaching due date, manual manager request, or project review meeting preparation.

## Tools Required (Concept Level)

- Project, task, milestone, owner, and status history reader contracts.
- Comment, decision, file, and activity timeline reader contracts.
- Time entry and billing-readiness context reader contracts for delivery impact.
- Status summary draft contract with internal and customer-visible variants.
- Action suggestion contract for owner, due date, blocker, and clarification request.
- Notification and escalation contracts for project manager, task owner, and account owner.
- Approval and audit contracts for customer-visible publication.

## Supervision And Human Handoff

The agent may prepare internal summaries and suggest actions, but project assignment changes, customer-visible status, and commitment wording require project manager approval. The project manager edits the summary, chooses visibility, confirms next actions, and owns any customer communication. Escalation to sales or finance is required when delivery risk affects renewal, billing, or commercial terms.

## Bilingual FR EN Requirements

The agent must produce French and English summaries using the project or customer language preference. Internal coaching notes can use the manager's language preference, while customer-visible drafts must follow the customer's preference. Dates, milestone names, currency references, and service terminology must remain consistent across both languages.

## Success Metrics

- Status preparation time.
- Overdue action count after weekly review.
- Customer update cadence.
- Manager edit rate on generated summaries.
- Decision capture completeness.
- Escalation completion for blockers affecting billing or customer commitments.

## Risks

- Summaries can imply certainty where project evidence is weak.
- Customer-visible wording can create commitments not approved by the project manager.
- Overdue status signals can become noisy without tenant-specific thresholds.
- Sensitive delivery or finance context can be exposed to the wrong audience.
- Benchmark status report formats and workspace templates carry high anti-copy risk.

## Anti-Copy Notes

No external project-management status labels, workspace templates, prompt patterns, automation recipes, demo projects, screenshots, or customer update wording may be reused. OpenERP status coaching must be written from project facts, tenant policy, and object-bound audit events. External products remain public benchmarks or functional references only.

## OpenERP Takeaways

- Build the agent around project manager accountability, not autonomous project control.
- Separate internal coaching from customer-visible publication.
- Make customer commitments, blockers, and billing impact explicit review points.
- The strongest MVP path is weekly status preparation plus stale-task escalation.
