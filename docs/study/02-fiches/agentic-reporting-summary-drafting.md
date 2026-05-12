# Reporting Summary Drafting Agent

## Evidence

- Internal synthesis: `docs/study/12-agentic/agents-by-use-case.md`, checked 2026-05-11, maps Operational Summary Drafting to scheduled draft creation with human review and conversational drill-down. It cites ThoughtSpot Spotter (2025), Glean Agents (2025-06-10), and You.com Agents (2025). Proprietary entries are public benchmark only.
- Functional map: `docs/study/06-functional-map/agentic-functional-map.md`, checked 2026-05-11, defines Operational Report Draft Agent and KPI Narrative Agent for CRM, project, billing, finance, and workflow summaries. This is OpenERP-written functional reference.
- MVP boundary: `docs/study/10-mvp-specs/reporting-automation.md`, checked 2026-05-11, defines saved views, report runs, scheduled delivery, dashboards, exports, permissions, and FR/EN labels.

## Business Outcome

Help managers produce short, permission-aware summaries of sales, delivery, billing, AR, workflow failures, and close status without manually assembling multiple reports.

## Agent Mode

Autonomous scheduled for internal draft preparation. Conversational for authorized drill-down and manager edits. Workflow-typed when a scheduled delivery or export requires a fixed report contract and permission check.

## Trigger

- Weekly management packet schedule.
- Month-end finance close update.
- Dashboard or saved view summary request.
- Project margin or invoice aging review.
- Workflow failure summary requested by an admin.

## Tools Required (Concept Level)

- Saved view and report definition reader contract.
- Report run and export status reader contract.
- Dashboard widget context reader contract with underlying permission enforcement.
- Summary draft writer contract with object links and action items.
- Scheduled delivery review contract for recipients, locale, and visibility.
- Audit event contract for draft creation, approval, and distribution.

## Supervision And Human Handoff

The agent can prepare internal draft summaries and point back to source reports. A manager, finance user, or admin must approve distribution to a broader audience, export creation, or customer-visible reuse. Any summary containing restricted finance data inherits the strictest source permission.

## Bilingual FR EN Requirements

Report titles, column labels, summary headings, action-item wording, notification text, and scheduled delivery text must be available in French and English. Recipient language controls delivery language; numeric values and source report links remain unchanged.

## Success Metrics

- Summary preparation time.
- Data-filter correction count.
- Scheduled delivery completion.
- Follow-up action creation count.
- Recipient access failure count.

## Risks

- Summarizing data a recipient is not allowed to see.
- Overstating causality where the report only shows a correlation.
- Losing source links needed for manager review.
- Publishing stale report runs.
- Creating vague narratives without actionable owner or object link.

## Anti-Copy Notes

Do not reuse external analytics UI, chart examples, report prose, prompts, natural-language query examples, workflow definitions, screenshots, catalog UI, builder UI, policy syntax, sandbox configuration, or external interop catalog naming. OpenERP summaries must be written from first-party report definitions and saved views.

## OpenERP Takeaways

The first version should be a supervised drafting layer over approved reports, not a new BI authoring product. Its value is speed, source links, FR/EN output, and permission-aware distribution.
