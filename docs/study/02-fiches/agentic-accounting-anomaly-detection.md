# Accounting Anomaly Detection Agent

## Evidence

- Internal synthesis: `docs/study/12-agentic/agents-by-use-case.md`, checked 2026-05-11, maps Accounting Anomaly Detection to scheduled monitoring with workflow-typed checkpoints before any correction. It cites Digits AI Agents (2025-06-23), Campfire (2025-06-30), and Auditoria AI (2025-08-26). Proprietary entries are public benchmark only.
- Functional map: `docs/study/06-functional-map/agentic-functional-map.md`, checked 2026-05-11, defines Journal Entry Review Agent and Close Checklist Agent with posting gates, close controls, and finance handoff. This is OpenERP-written functional reference.
- MVP boundary: `docs/study/10-mvp-specs/billing-accounting.md`, checked 2026-05-11, requires balanced journal entries, effective-dated tax rates, locked periods, finance exports, and audit events.

## Business Outcome

Reduce accounting risk by surfacing unusual postings, stale approvals, missing source documents, tax-field inconsistencies, and period-close blockers early enough for finance review.

## Agent Mode

Autonomous scheduled for monitoring open finance worklists, with workflow-typed checkpoints before any correction or posting step. Conversational mode supports finance explanations and review notes.

## Trigger

- Nightly accounting review schedule.
- Manual journal draft created.
- Import batch created.
- Period marked as closing.
- Large movement, missing attachment, duplicate reference, or tax mismatch detected by OpenERP rules.

## Tools Required (Concept Level)

- Journal entry and journal line reader contract.
- Chart of accounts, tax configuration, and accounting period reader contract.
- Source document and attachment completeness checker.
- Accounting policy gate for balance, period, amount, account, tax, and approval constraints.
- Review item writer contract for anomaly explanations and requested evidence.
- Finance audit event and notification contracts.

## Supervision And Human Handoff

The agent can create review items, block incomplete drafts where policy allows, and notify finance. It cannot post, reverse, write off, reopen a period, or change tax configuration. Sensitive entries, closed-period corrections, missing evidence, and repeated unusual patterns hand off to the finance manager.

## Bilingual FR EN Requirements

Review reasons, finance notifications, and audit explanations must exist in French and English. Accounting codes, amounts, journal identifiers, tax registration references, and source document links remain exact and language-neutral.

## Success Metrics

- Incomplete journal drafts blocked before posting.
- Correction count after finance review.
- Period-close interruption count.
- Missing attachment count.
- Finance review turnaround.

## Risks

- False alarms causing finance users to ignore alerts.
- Missing a rare but material accounting issue because policy coverage is incomplete.
- Treating an unusual but valid business event as an error.
- Leaking sensitive finance details through notifications.
- Weak audit evidence if reasons are not linked to source records.

## Anti-Copy Notes

Do not reuse external anomaly taxonomies, finance labels, report layouts, prompts, workflow definitions, demos, screenshots, catalog UI, builder UI, policy syntax, sandbox configuration, or external interop catalog naming. OpenERP detection must derive from its own chart, period, journal, tax, and approval rules.

## OpenERP Takeaways

This agent belongs behind conservative finance controls. It should first create review work and explain policy hits; corrective actions remain typed workflow steps owned by finance.
