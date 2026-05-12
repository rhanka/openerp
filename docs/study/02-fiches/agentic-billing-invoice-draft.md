# Billing Invoice Draft Agent

## Evidence

- Internal synthesis: `docs/study/12-agentic/agents-by-use-case.md`, checked 2026-05-11, maps Invoice Draft Preparation to workflow-typed billing assembly and cites Campfire Ember AI (2025-06-30), Digits AI Agents (2025-06-23), and Auditoria finance agents (2025-08-26). Proprietary entries are public benchmark only.
- Functional map: `docs/study/06-functional-map/agentic-functional-map.md`, checked 2026-05-11, defines the Invoice Draft Preparation Agent with finance review before issue and posting. This is OpenERP-written functional reference.
- MVP boundary: `docs/study/10-mvp-specs/billing-accounting.md`, checked 2026-05-11, requires invoice drafts from project proposals, recurring schedules, manual lines, source traceability, tax abstraction, and journal posting controls. This is the OpenERP product boundary.

## Business Outcome

Reduce invoice preparation time while preserving traceability from contract, project, approved time, milestone, expense, and recurring schedule records. The agent should help finance prepare a clean draft, expose missing approvals, and reduce disputed lines before the invoice is issued.

## Agent Mode

Workflow-typed for invoice assembly, because the output must satisfy a fixed finance contract before downstream billing and accounting actions. Conversational mode is used when a finance user asks why a line was included, changes customer-facing wording, or requests a corrected draft.

## Trigger

- Billing period close.
- Approved project invoice proposal.
- Approved billable time or completed milestone.
- Recurring schedule due date.
- Manual finance request from an invoice draft screen.

## Tools Required (Concept Level)

- Invoice source reader contract for approved time, milestones, expenses, service catalog items, and recurring schedules.
- Contract and customer billing context reader contract.
- Draft invoice writer contract that can create and update draft-only invoice lines with source references.
- Tax treatment resolver contract using configured tax registrations, categories, and effective dates.
- Finance policy gate for issue, posting, void, write-off, and closed-period constraints.
- Audit event writer and explanation formatter for finance review.

## Supervision And Human Handoff

The agent can prepare draft lines and explain source references, but it cannot issue an invoice, post a journal entry, change tax settings, or send customer-visible text without finance approval. Handoff goes to the finance user for ordinary review, and to the finance manager when tax treatment, closed period, write-off, or unusual amount policy is involved.

## Bilingual FR EN Requirements

Draft invoice labels, line descriptions, validation messages, and customer notes must be available in French and English. The customer language on the invoice determines rendering language unless the finance user overrides it. Stored amounts, currency, tax version references, and source links remain language-neutral.

## Success Metrics

- Invoice draft cycle time.
- Manual line correction count.
- Source trace completeness.
- Missing approval count at review.
- Disputed-line count after issue.

## Risks

- Incorrect tax treatment if regional rule packs are incomplete.
- Draft lines created from unapproved or stale project records.
- Customer-facing wording that implies contractual terms not approved by finance.
- Overreach into posting or issuing actions that must remain human-controlled.
- Poor source traceability that weakens audit review.

## Anti-Copy Notes

External finance products and agent platforms are evidence only. Do not reuse invoice screens, prompts, line examples, rate logic, tool schemas, workflow definitions, demos, screenshots, catalog UI, builder UI, policy syntax, sandbox configuration, or external interop catalog naming. OpenERP invoice draft behavior must be authored from the billing/accounting MVP spec and the OpenERP functional map.

## OpenERP Takeaways

This agent is a strong MVP candidate because it attaches to an existing controlled workflow and has an obvious finance reviewer. Keep the first version draft-only, source-linked, bilingual, and policy-gated; issue and posting remain explicit finance actions.
