# Collaboration Decision Summarization Agent

## Evidence

- Internal synthesis: `docs/study/12-agentic/agents-by-use-case.md`, checked 2026-05-11, maps Decision Summarization to workflow-typed extraction of decision, owner, date, impacted object, follow-up, and uncertainty notes. It cites Glean Agents (2025-06-10), Notion Custom Agents (2026-02-24), and Sana (2025-11-04). Proprietary entries are public benchmark only.
- Collaboration boundary: `docs/study/07-mvp/collaboration-mvp-addendum.md`, checked 2026-05-11, includes structured decisions and approvals with requester, approver, reason, status, timestamps, attachments, and audit link.
- Functional map: `docs/study/06-functional-map/agentic-functional-map.md`, checked 2026-05-11, defines Decision Capture Agent with human confirmation before a decision unlocks a business process. This is OpenERP-written functional reference.

## Business Outcome

Turn informal object discussions into structured, auditable decision records that preserve owner, authority, impact, evidence, and follow-up without forcing teams to manually reconstruct every thread.

## Agent Mode

Workflow-typed when a decision affects an approval, invoice, project, support case, or customer-visible process. Conversational when a user asks for a decision summary before saving or requesting approval.

## Trigger

- User asks to summarize an object thread.
- Approval discussion reaches a closing point.
- Meeting note or comment is marked for decision capture.
- Workflow gate requires evidence before moving forward.
- Handover package requires a decision log.

## Tools Required (Concept Level)

- Comment, page, file, approval, and activity reader contract bound to a business object.
- Decision draft writer contract with owner, authority, date, impact, evidence, follow-up, and uncertainty fields.
- Approval state reader and update request contract.
- Attachment and audit link contract.
- Visibility gate for internal versus customer-visible decision records.
- Notification contract for approver or object owner review.

## Supervision And Human Handoff

The agent drafts the decision record and highlights uncertainty. A human approver or object owner confirms authority, final wording, visibility, and whether the decision unlocks any downstream workflow. Decisions that affect finance, customer commitments, project scope, or support resolution require explicit approval.

## Bilingual FR EN Requirements

Decision summaries, approval prompts, uncertainty notes, and notification text must exist in French and English. The final record should preserve source language references and allow the approver to choose the saved language for customer-visible records.

## Success Metrics

- Decision capture completeness.
- Approval latency.
- Missing evidence count.
- Reopened decision count.
- Audit export readiness.

## Risks

- Mistaking informal discussion for an authorized decision.
- Omitting dissent, conditions, or unresolved uncertainty.
- Saving a customer-visible decision before approval.
- Linking evidence outside the user's permission scope.
- Triggering downstream workflow from an unconfirmed summary.

## Anti-Copy Notes

Do not reuse external decision templates, collaboration labels, prompt examples, workspace UI, demos, screenshots, catalog UI, builder UI, policy syntax, sandbox configuration, or external interop catalog naming. OpenERP decision records must be designed from its own object, approval, permission, and audit model.

## OpenERP Takeaways

Decision summarization is valuable because it connects collaboration to business control. Keep the agent draft-first, evidence-linked, and human-confirmed before any workflow effect.
