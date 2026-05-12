# Accounting AP Triage Agent

## Evidence

- Internal synthesis: `docs/study/12-agentic/agents-by-use-case.md`, checked 2026-05-11, maps Accounts Payable Triage to supplier invoice ingestion, duplicate checks, tax field capture, and approver routing. It cites Klarity (2025), Ramp Agents for AP (2025-10), and Brex AI (January 2024 general availability noted). Proprietary entries are public benchmark only.
- Patterns library: `docs/study/12-agentic/patterns-library.md`, checked 2026-05-11, maps extraction, classification, document QA, compliance validation, and notification patterns to accounting operations. This is OpenERP-written functional reference.
- License posture: `docs/study/12-agentic/license-posture.md`, checked 2026-05-11, treats proprietary finance and AP products as public benchmark only and forbids copying prompts, schemas, workflows, demos, UI, policy syntax, and sandbox configuration.

## Business Outcome

Reduce supplier invoice intake friction by extracting key facts, routing approval, detecting duplicates, and identifying payment-sensitive exceptions before AP records reach posting or payment preparation.

## Agent Mode

Workflow-typed for uploaded supplier invoices, mailbox ingestion, or procurement handoff. Conversational for AP user review when fields, vendor identity, cost allocation, or approval owner are uncertain.

## Trigger

- Supplier invoice uploaded to a vendor, project, purchase, or finance object.
- AP mailbox ingestion event.
- Attachment added to an invoice approval thread.
- Duplicate vendor reference detected.
- Period close AP review.

## Tools Required (Concept Level)

- Supplier document reader and extraction contract for invoice date, reference, amount, currency, tax fields, and attachments.
- Vendor, project, purchase, and cost allocation lookup contract.
- Duplicate invoice check contract using supplier, reference, amount, date, and attachment fingerprint.
- Approval owner resolver contract based on tenant policy and object context.
- AP worklist writer contract for review state, missing fields, and exception reasons.
- Audit event and notification contracts.

## Supervision And Human Handoff

The agent can prepare AP triage records and route review tasks. It cannot create a final accounting entry, approve payment, change vendor master data, or post tax treatment without AP or finance approval. Duplicate signals, missing tax evidence, unknown vendors, and unusual amounts hand off to the finance manager or configured approver.

## Bilingual FR EN Requirements

Extraction labels, missing-field messages, approval requests, and vendor-facing clarification drafts must be available in French and English. Stored supplier data, invoice references, amounts, tax fields, and currency remain exact source facts.

## Success Metrics

- AP intake cycle time.
- Missing-field count at finance review.
- Duplicate invoice prevention count.
- Approval routing correction count.
- Payment-sensitive exception count.

## Risks

- Extracting incorrect supplier, tax, or amount fields from a document.
- Routing approval to a user without business authority.
- Mistaking a legitimate recurring supplier invoice for a duplicate.
- Creating payment pressure before AP approval.
- Importing vendor data from untrusted attachments.

## Anti-Copy Notes

Do not reuse extraction prompts, invoice demos, supplier examples, approval workflows, document review UI, tool schemas, workflow definitions, screenshots, catalog UI, builder UI, policy syntax, sandbox configuration, or external interop catalog naming from AP benchmarks. OpenERP AP triage must use original field rules and approval language.

## OpenERP Takeaways

AP triage is commercially important but should remain post-intake and pre-posting in the initial study posture. The agent creates a better review queue; humans retain vendor, accounting, tax, and payment authority.
