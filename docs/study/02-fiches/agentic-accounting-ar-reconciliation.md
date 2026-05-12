# Accounting AR Reconciliation Agent

## Evidence

- Internal synthesis: `docs/study/12-agentic/agents-by-use-case.md`, checked 2026-05-11, maps Accounts Receivable Reconciliation to workflow-typed matching after bank import, payment webhook, or finance review. It cites Auditoria (2025-08-26), Brex AI (January 2024 general availability noted), and Digits Autonomous General Ledger (2025-03-10). Proprietary entries are public benchmark only.
- Functional map: `docs/study/06-functional-map/agentic-functional-map.md`, checked 2026-05-11, defines Reconciliation Worklist Agent with match suggestions, exception queues, audit logs, and finance approval. This is OpenERP-written functional reference.
- MVP boundary: `docs/study/10-mvp-specs/billing-accounting.md`, checked 2026-05-11, includes payments, invoice balances, AR aging, journal entries, export-ready ledger data, and period close controls.

## Business Outcome

Accelerate accounts receivable review by grouping likely invoice, payment, credit, and customer-reference matches while surfacing exceptions with clear evidence. The agent should reduce manual matching work without bypassing finance approval for posting, write-off, reversal, or correction.

## Agent Mode

Workflow-typed at the reconciliation review point. Conversational mode supports finance explanations when a user asks why a match is suggested or why an item is blocked.

## Trigger

- Bank statement import.
- Payment webhook.
- Manual payment registration.
- Posted invoice or credit event.
- Period close review.

## Tools Required (Concept Level)

- Ledger and AR aging reader contract.
- Invoice, payment, credit, and customer reference lookup contract.
- Bank import record reader contract.
- Match simulation contract that returns proposed pairings and exception reasons without posting.
- Reconciliation worklist writer contract for review items.
- Finance approval, audit event, and correction request contracts.

## Supervision And Human Handoff

The agent can propose matches and create review items. A finance user must accept a match, post accounting effects, approve write-off, request correction, or escalate accounting treatment. Closed-period items, material differences, unknown references, and duplicate payment signals go to a finance manager.

## Bilingual FR EN Requirements

Finance explanations, exception reasons, approval prompts, and audit messages must exist in French and English. Customer language may affect invoice labels, but reconciliation evidence must preserve source document identifiers, amounts, dates, and currency without translation drift.

## Success Metrics

- Unmatched item count.
- Reconciliation cycle time.
- Manual correction count.
- Accepted match ratio.
- Close delay caused by AR items.

## Risks

- Matching the wrong customer payment to an invoice.
- Hiding duplicates or partial payments behind a simple suggestion.
- Posting into a closed or closing period without the required control.
- Losing source references needed for audit export.
- Over-reliance on similarity where accounting rules require explicit evidence.

## Anti-Copy Notes

Do not reuse proprietary reconciliation screens, matching rules, journal examples, prompts, workflow definitions, demos, screenshots, catalog UI, builder UI, policy syntax, sandbox configuration, or external interop catalog naming. OpenERP matching logic must be specified from its own ledger, invoice, payment, and audit entities.

## OpenERP Takeaways

AR reconciliation is appropriate for an early finance agent only if it remains suggestion-first and audit-heavy. The core value is a transparent worklist with finance acceptance, not autonomous ledger mutation.
