# CRM Lead Qualification Agent

## Evidence

- Internal OpenERP reference: `docs/study/06-functional-map/agentic-functional-map.md`, section "Lead Intake And Qualification Agent", used as functional reference for outcome, trigger, tools, supervision, and anti-copy boundary.
- Internal OpenERP dated research: `docs/study/12-agentic/agents-by-use-case.md`, section "Lead Qualification And Routing", checked 2026-05-11. LangGraph (MIT, checked 2026-05-11), PydanticAI (MIT, checked 2026-05-11), and Casbin (Apache-2.0, checked 2026-05-11) are functional references only for orchestration, typed validation, and access control.
- Public benchmark only: HubSpot Breeze Agents product page 2025; Salesforce Agentforce announcement 2024-09-12; Gong AI revenue-team announcement 2025-10. These sources validate market demand for CRM-native sales agents, not OpenERP wording or implementation.

## Business Outcome

The agent reduces manual lead triage by turning inbound demand into clean lead, account, contact, language, owner, and next-activity records. The business value is faster first response, fewer duplicate CRM records, more consistent sales handoff, and better revenue capture from web forms, emails, imports, and event lists.

## Agent Mode

Primary mode is workflow-typed: the agent runs inside lead intake and import flows, producing draft CRM changes that preserve the typed contract of OpenERP CRM objects. Conversational mode is used when a sales operations user reviews ambiguous matches, missing fields, or assignment suggestions. Autonomous event-driven mode is limited to low-risk internal notifications when a new unassigned lead arrives.

## Trigger

Triggers include a web form submission, inbound sales email, imported lead list, event attendee list, portal request, or manual user request from a CRM lead view. A secondary trigger can run when a lead remains incomplete after a configured intake window.

## Tools Required (Concept Level)

- CRM lead intake reader for inbound payloads, email metadata, and import rows.
- Account and contact lookup contract with duplicate candidate retrieval.
- Field normalization contract for names, company, role, language, location, channel, and consent fields.
- Opportunity and activity creation contract limited to draft or pending-review state.
- Owner suggestion contract using team territory, existing account owner, and current workload context.
- Internal notification and audit event contract for handoff and trace review.
- Policy check contract for merge, deletion, reassignment, and customer-facing activity creation.

## Supervision And Human Handoff

The agent may create low-risk draft leads and propose first activities, but merge, deletion, owner change on an existing account, and any customer-facing outreach require human approval. Sales operations or the account owner resolves ambiguous matches, confirms the initial owner, and accepts or edits the proposed next action. Every accepted, rejected, or modified proposal is written to the CRM audit trail.

## Bilingual FR EN Requirements

The agent detects or preserves preferred language from form fields, email language, account record, or explicit user choice. Draft activity titles, owner notifications, field explanations, and audit messages must be available in French and English. Customer-facing text is not sent by this agent; if it prepares a first outreach brief, the brief must match the contact's preferred language and remain human-reviewed.

## Success Metrics

- Lead intake cycle time from arrival to usable CRM draft.
- Required-field completion rate on newly accepted leads.
- Duplicate candidate resolution time.
- First-response latency after owner confirmation.
- Manual correction volume after lead acceptance.
- Owner acceptance rate for suggested assignments.

## Risks

- Incorrect duplicate matching can merge or fragment customer history.
- Incomplete consent or language handling can create communication risk.
- Over-automation can hide low-quality imported lists behind apparently clean records.
- Sales territory or ownership rules can be politically sensitive and require tenant-specific policy.
- Public benchmark products expose visible sales terminology that must not leak into OpenERP field names or help text.

## Anti-Copy Notes

All qualification criteria, field labels, prompt text, examples, demos, screenshots, CRM layouts, owner rules, and workflow expression must be OpenERP-authored. Public CRM agent products are evidence for the business surface only. Open source frameworks can inform high-level orchestration and validation concepts only; no external prompt, contract surface, sample data, or example conversation is reused.

## OpenERP Takeaways

- Treat lead qualification as CRM data hygiene plus governed handoff, not as autonomous sales decision-making.
- Keep automatic actions limited to draft record creation and internal notification until tenant policy matures.
- Make language preference a first-class lead attribute because it affects follow-up, audit, and customer experience.
- The first useful MVP slice is import and inbound-form triage with explicit duplicate review.
