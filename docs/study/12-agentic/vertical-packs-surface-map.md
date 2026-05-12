# Agentic Vertical Packs Surface Map

## Progress

Fait: Task 9 map drafted from the agentic plan, glossary terms, global functional map, and phase boundary decisions.
À faire: share the vertical-surface view with the business-agent fiche owners so task-level candidates align with this boundary.
Attendu: no further scope decision is required for this artifact; keep this file as surface-level guidance.

## Scope

This map is a surface-only view for five vertical domains intentionally kept outside the first
agentic MVP band. Each entry stays high-level: candidate agent ideas, required domain
preconditions, and dependency links to existing OpenERP modules.

Each surface is explicitly marked as:

- `later vertical pack, not part of the agentic MVP`

No deep design, no workflow graph, and no implementation-ready policy language is included here.

## Procurement Surface

- Candidate agents:
  - Vendor onboarding validation agent (purchase docs, registrations, sanctions checks, and partner profile consistency).
  - Purchase request triage agent (priority routing for high-touch procure-to-pay cases and exception flags).
  - Contract-and-terms extraction agent (PO/contract clause capture for downstream AP and tax control).
- Dependencies on existing OpenERP domains:
  - CRM and sales/contracts for supplier identification and approval routing.
  - Accounting operations for AP workflows, approval states, and audit trace.
  - Documents and object-bound collaboration for review evidence and decision history.
  - Inventory/catalog objects for cataloged goods and service categories once stock becomes a pilot requirement.
- later vertical pack, not part of the agentic MVP

## MES Surface

- Candidate agents:
  - Production exception summarizer (shop-floor exception clustering and escalation recommendation).
  - Work-order status monitor (delay risk summaries before planning/dispatch updates).
  - Maintenance readiness checker (shift-handover and lockout/restart prerequisites).
- Dependencies on existing OpenERP domains:
  - Project/service delivery for task ownership and execution traceability.
  - Reporting for exception trend views and drill-down on recurring floor delays.
  - Collaboration objects for incident notes, approvals, and operational comments.
  - HR/time for operator assignment and attendance context.
- later vertical pack, not part of the agentic MVP

## WMS Surface

- Candidate agents:
  - Receiving intake triage agent (inbound shipment checks and discrepancy flags).
  - Stock-location anomaly agent (unexpected stock delta and rule-based inconsistency notices).
  - Picking-and-packing readiness assistant (pack list sanity checks before dispatch).
  - Shipment exception assistant (document and status reconciliation across logistics partners).
- Dependencies on existing OpenERP domains:
  - Inventory/product and locations for item identity and movement lineage.
  - Accounting operations for valuation and cost-transfer consistency.
  - Reporting for operational visibility, cycle-count planning, and exception tracking.
  - Collaboration for operator comments and audit evidence.
- later vertical pack, not part of the agentic MVP

## Payroll Surface

- Candidate agents:
  - Payroll-prep data quality agent (time, leave, and remuneration consistency checks).
  - Payroll export pack verifier (ready-to-export bundle checks and reconciliation summary).
  - Payslip packet generator assistant (document set completeness before payroll upload).
- Dependencies on existing OpenERP domains:
  - HR master data and time/leave for employee records and payroll context.
  - Accounting operations for posting mappings and compliance-aware export structure.
  - Documents for generated payroll packets and correction notes.
  - Collaboration for payroll-cycle review notes and approval threads.
- later vertical pack, not part of the agentic MVP

## Manufacturing Planning Surface

- Candidate agents:
  - Demand and capacity drift monitor (forecast mismatch, resource bottleneck indicators).
  - BOM and routing consistency assistant (inconsistencies before plan execution).
  - Planning alert assistant (late order impact and replanning suggestion summaries).
- Dependencies on existing OpenERP domains:
  - Sales and services for demand signals and contract commitments.
  - Inventory/catalog for demand item profiles and location planning.
  - Project/service delivery for task windows and resource overlap checks.
  - Reporting and automation for scheduled alerts and executive updates.
- later vertical pack, not part of the agentic MVP

## Reuse Of Patterns Library

These surfaces are expected to draw on the following pattern families described in
[`docs/study/12-agentic/patterns-library.md`](patterns-library.md):

- extraction and classification (for incoming procurement, payroll, and planning inputs),
- document QA and compliance validation (for contract and payroll packet control),
- reconciliation and anomaly detection (for AP, stock, and planning mismatch flows),
- summarization and notification/escalation (for operator-facing exception updates),
- multi-tool orchestration (for cross-domain follow-up in all five surfaces).

## Reuse Of MVP Identity And Marketplace Design Spaces

The same core boundaries used in MVP planning apply to all vertical-pack candidates:

- agent identities stay bounded by OpenERP tenant, permission, and object ownership rules;
- activation and execution paths can begin in private tenant posture, with future extension to
  curated and public paths via the same marketplace model;
- conversation/notification language and escalation logs are governed by the same bilingual FR/EN policy and
  supervision posture already defined for the core agentic family.

For MVP execution, these surfaces are surface-only so no additional marketplace tier decisions are required
beyond boundary tracking.

## Anti-Copy Notes

- No vendor prompts, tool schemas, workflow graphs, eval sets, onboarding copy, or catalog wording is reused.
- This map is rewritten in OpenERP terms only and does not copy feature labels, UI blocks, or sequencing from external products.
- Any future implementation for these vertical packs must remain within the anti-copy rule and the MIT-target posture documented in
  `docs/study/12-agentic/license-posture.md`.

## OpenERP Takeaways

- The five surfaces are commercially meaningful for manufacturing-heavy and distribution-heavy users, but they are intentionally
  deferred to preserve the service-company-first MVP path.
- The existing domain map already contains enough shared objects for surface scanning (supplier, inventory, payroll,
  planning, and work-order-related records) to support future proof-of-concept pilots without redesigning the core.
- Reuse should stay at the requirement and process level until the core agentic extension proves operational value in CRM, project/time, billing,
  accounting operations, and reporting automation.
