# Project Timesheet Classification Agent

## Evidence

- Internal OpenERP reference: `docs/study/06-functional-map/agentic-functional-map.md`, section "Time Entry Review Agent", used as functional reference for timesheet review gates, project context, finance handoff, and business outcome.
- Internal OpenERP dated research: `docs/study/12-agentic/agents-by-use-case.md`, section "Timesheet Classification", checked 2026-05-11. PydanticAI (MIT, checked 2026-05-11), BAML (Apache-2.0, checked 2026-05-11), and OPA (Apache-2.0, checked 2026-05-11) are functional references only for typed classification, structured output, and policy gates.
- Public benchmark only: Brex AI platform with January 2024 GA note; UiPath agentic automation announcement 2024-10; Workato AI announcement 2025-08-19. These sources validate policy-aware operational automation without authorizing label sets or approval flows.

## Business Outcome

The agent protects invoice accuracy and project margin by helping classify submitted time as billable, non-billable, internal, warranty, support, or pending clarification according to OpenERP project and contract context. It reduces finance rework before invoice preparation and gives project managers a clearer review queue.

## Agent Mode

Primary mode is workflow-typed: the agent runs at submitted time-entry review and invoice-readiness gates. Autonomous scheduled mode can scan weekly for late, incomplete, or inconsistent entries and create internal review tasks. Conversational mode supports manager clarification when an entry's project, task, or billing eligibility is ambiguous.

## Trigger

Triggers include a submitted time entry, weekly review window, milestone review, invoice draft generation, project manager request, or policy check detecting missing task, missing customer, unusual duration, or unclear billing context.

## Tools Required (Concept Level)

- Timesheet entry reader contract covering user, date, duration, note, project, task, and current approval state.
- Project task and milestone context reader contract.
- Contract, service catalog, warranty, support, and billing rule reader contracts.
- Classification proposal contract that writes a pending review value, rationale, and required clarification.
- Correction request and approval queue contracts for project manager and finance user.
- Invoice-readiness blocker contract for entries that cannot move forward.
- Audit event contract recording proposal, human decision, and final billing eligibility.

## Supervision And Human Handoff

The agent may propose a class, request clarification, or block an entry from invoice readiness, but approval remains with the project manager or finance user. Any change that affects customer billing, warranty handling, or margin reporting requires explicit human acceptance. Disputes between project and finance route to a manager review queue.

## Bilingual FR EN Requirements

Employee-facing clarification requests and manager review notes must be available in French and English. The agent must preserve task names, service terms, and customer-visible time descriptions in the language used by the project or invoice. Audit events must record the language of the time note and the language of the review explanation.

## Success Metrics

- Late-entry count at weekly review.
- Correction cycle time.
- Billable-entry approval latency.
- Invoice-blocking exception count.
- Human acceptance rate for proposed classes.
- Post-review billing correction volume.

## Risks

- Misclassification can underbill, overbill, or distort project margin.
- Employee notes can be vague, multilingual, or sensitive.
- Contract and warranty rules can vary by tenant and project.
- Automated nudges can frustrate staff if they do not explain the needed correction.
- External time-tracking examples and approval labels must not be mirrored.

## Anti-Copy Notes

No external time policy example, prompt text, label set, approval form, workflow definition, demo entry, screenshot, or product terminology may be reused. OpenERP class names, review text, and policy checks must be authored from OpenERP contracts, project rules, and billing requirements.

## OpenERP Takeaways

- Keep the agent inside a human-approved review gate before invoice impact.
- Treat time classification as a joint project and finance workflow.
- Require clear evidence for any billing eligibility proposal.
- The MVP slice should focus on submitted-entry review and weekly exception detection.
