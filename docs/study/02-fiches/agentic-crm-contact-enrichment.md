# CRM Contact Enrichment Agent

## Evidence

- Internal OpenERP reference: `docs/study/12-agentic/agents-by-use-case.md`, section "Contact Enrichment And Timeline Hygiene", checked 2026-05-11, used as the main use-case evidence for contact normalization, duplicate review, and timeline cleanup.
- Internal OpenERP reference: `docs/study/06-functional-map/agentic-functional-map.md`, section "Lead Intake And Qualification Agent", used as functional reference for CRM object lookup, duplicate detection, field normalization, and assignment notification.
- Functional references only: BAML (Apache-2.0, checked 2026-05-11), PydanticAI (MIT, checked 2026-05-11), and OpenInference (Apache-2.0, checked 2026-05-11), cited in the use-case research for structured extraction, typed validation, and traces.
- Public benchmark only: HubSpot AI Breeze product page 2025 and Gong AI data extraction announcement 2025-10, documented in `docs/study/04-proprietary-references/agentic-references.md`, validate CRM data enrichment demand without authorizing field catalog or UI reuse.

## Business Outcome

The agent improves CRM reliability by proposing normalized contact fields, relationship links, language preference, duplicate candidates, and missing required data. The business value is cleaner customer history, fewer manual corrections, better segmentation for follow-up, and more dependable handoff between sales, delivery, and finance.

## Agent Mode

Primary mode is workflow-typed during imports, email capture, duplicate detection, and contact update review. Conversational mode is used when a user asks why a change is proposed or resolves an ambiguous person-company relationship. Autonomous scheduled mode can run read-only hygiene checks and create internal review tasks for stale or incomplete contact records.

## Trigger

Triggers include contact import, new inbound email, lead conversion, duplicate candidate detection, manual enrichment request, stale contact review, or account ownership change.

## Tools Required (Concept Level)

- Contact, account, lead, opportunity, and timeline reader contracts.
- Duplicate candidate retrieval contract with explainable field comparison.
- Field normalization contract for names, titles, company links, language, phone, email, address, province or state, and consent markers.
- Relationship suggestion contract for person-to-company and company-to-company links.
- Contact update draft contract that separates proposed values from accepted values.
- Review task and notification contracts for account owners or sales operations.
- Audit event contract recording source evidence, human decision, and final field change.

## Supervision And Human Handoff

The agent may propose enrichment and create review tasks, but it cannot merge contacts, overwrite key identity fields, or change consent fields without explicit human approval. Account owners or sales operations confirm source evidence and choose whether to accept, edit, or reject each proposed update. Bulk acceptance requires a tenant admin or delegated CRM operations role.

## Bilingual FR EN Requirements

Language preference is a first-class enrichment target. The agent must preserve French and English variants for titles, notes, and review explanations where relevant. Address, province or state, phone, date, and currency references must follow the contact's locale or tenant default. Audit events must show the language context used when the enrichment was proposed.

## Success Metrics

- Required-field completion rate for active contacts.
- Duplicate candidate closure time.
- Human acceptance rate for proposed field updates.
- Manual correction volume after enrichment.
- Contact records with confirmed language preference.
- Stale contact review completion.

## Risks

- External or inferred data can be stale, misattributed, or not permitted for use.
- Duplicate logic can incorrectly combine separate people or companies.
- Language and consent fields are sensitive and require clear provenance.
- Over-normalization can erase useful local naming conventions.
- Contact enrichment benchmarks often expose distinctive field catalogs and UI flows that must not be copied.

## Anti-Copy Notes

No external enrichment field catalog, prompt text, matching example, demo dataset, screenshot, data-provider flow, or CRM UI expression may be reused. OpenERP contact fields, review language, and audit messages must be authored from the OpenERP account and contact model. Public sources are evidence for functional need only.

## OpenERP Takeaways

- Contact enrichment belongs in a review queue, not in silent overwrite flows.
- Language preference, consent, and relationship provenance should be visible before acceptance.
- The MVP slice should focus on import cleanup, duplicate review, and timeline hygiene.
- A typed draft-update model protects CRM data while still reducing manual work.
