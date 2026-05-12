# Collaboration Note Drafting Agent

## Evidence

- Internal synthesis: `docs/study/12-agentic/agents-by-use-case.md`, checked 2026-05-11, maps Note Drafting On Business Objects to conversational drafting from object timelines with human save decision. It cites Notion Custom Agents (2026-02-24), Inkeep (2025), and Glean Agents (2025-06-10). Proprietary entries are public benchmark only.
- Collaboration boundary: `docs/study/07-mvp/collaboration-mvp-addendum.md`, checked 2026-05-11, includes object comments, files, activity timelines, decisions, pages, notification inbox, and permission-aware search attached to ERP/CRM records.
- Patterns library: `docs/study/12-agentic/patterns-library.md`, checked 2026-05-11, maps drafting, summarization, document QA, and customer communication to object-bound collaboration. This is OpenERP-written functional reference.

## Business Outcome

Reduce context loss by helping users draft concise notes on customers, projects, invoices, tasks, support cases, and handover pages while preserving the human record owner's authority.

## Agent Mode

Conversational by default. Workflow-typed only when a note is part of a governed handoff, approval package, or customer-visible update that requires a saved record and visibility check.

## Trigger

- User launches note drafting from an object timeline.
- Meeting notes, comments, files, or tasks are selected for summarization into a note.
- Project handover, invoice dispute, or support resolution needs a clean internal record.
- Customer-visible note is requested for review.

## Tools Required (Concept Level)

- Object timeline reader contract for comments, files, tasks, decisions, approvals, and system events.
- Permission-aware object context reader contract.
- Draft note writer contract limited to unsaved or review state.
- Page and attachment reference contract for linked context.
- Visibility and customer-facing approval gate.
- Audit event contract for saved notes and visibility changes.

## Supervision And Human Handoff

The agent drafts text only. The user chooses whether to save, edit, discard, or mark it customer-visible. Customer-visible notes, invoice dispute notes, support resolution notes, and handover notes that affect obligations require object owner approval.

## Bilingual FR EN Requirements

The agent must draft in French or English according to object language, customer language, or user choice. It should preserve original quoted facts without mistranslation and expose language changes before saving. Labels for save, visibility, and approval states must exist in both languages.

## Success Metrics

- Note preparation time.
- Saved draft ratio.
- Edit count before save.
- Missing context count reported by object owners.
- Customer-visible approval completion.

## Risks

- Inventing facts not present in the selected object history.
- Saving customer-visible notes without proper owner review.
- Mixing internal and external visibility.
- Summarizing files the user is not allowed to access.
- Overwriting human nuance in sensitive disputes or handovers.

## Anti-Copy Notes

Do not reuse workspace note templates, assistant personas, editor UI, onboarding copy, prompts, workflow definitions, demos, screenshots, catalog UI, builder UI, policy syntax, sandbox configuration, or external interop catalog naming. OpenERP note drafting must start from object timelines and tenant permissions.

## OpenERP Takeaways

This is a low-risk early collaboration agent when constrained to drafts and object scopes. It strengthens the object spine by turning scattered context into reviewable notes without creating a separate workspace product.
