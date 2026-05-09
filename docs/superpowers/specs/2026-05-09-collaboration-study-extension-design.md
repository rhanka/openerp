# OpenERP Collaboration Study Extension Design

Date: 2026-05-09
Status: Approved design, pending user review before execution planning
Target license for the future product: MIT

## 1. Purpose

This extension adds a collaboration domain to the existing OpenERP study. It is
a complement to the ERP/CRM/back-office research, not a pivot toward a generic
Notion, ClickUp, Slack, or Airtable clone.

The extension will study collaboration as a transverse product layer for:

- customers, contacts, opportunities, quotes, contracts, projects, tasks,
  invoices, support activity, files, decisions, and audit trails;
- service companies and recurring-service businesses first;
- manufacturing and field/service verticals where collaboration affects work
  execution, approvals, quality, maintenance, or customer communication;
- bilingual French/English usage from the beginning.

The study must preserve the same research discipline as the earlier OpenERP
study: evidence-backed fiches, license posture, controlled Graphify use,
functional maps, anti-copy boundaries, and a final synthesis update.

## 2. Product Positioning

Collaboration should strengthen the ERP/CRM flow rather than become a separate
horizontal workspace product.

The target product should eventually support three collaboration families:

- embedded collaboration: comments, mentions, tasks, files, notifications,
  approvals, decision threads, and activity timelines attached to ERP/CRM
  objects;
- knowledge workspace: pages, wiki spaces, reusable templates, meeting notes,
  customer/project knowledge, operating procedures, and versioned decisions;
- work management: lists, kanban-style boards, calendars, task ownership,
  dependencies, lightweight workload views, and operational checklists.

Team communication can be studied broadly, including chat and channels, but the
MVP posture should remain cautious. Async communication linked to business
objects is more important than a full Slack-like product in the first product
waves.

## 3. Approved Study Approach

The approved approach is a structured complement to the existing study:

1. Add collaboration candidates to the corpus.
2. Write normalized fiches for the strongest candidates and key proprietary
   references.
3. Clone and inspect selected open source repositories.
4. Run Graphify on selected candidates where the license and product fit justify
   deeper technical analysis.
5. Produce a collaboration functional map.
6. Update the MVP recommendation with collaboration-specific options.
7. Extend the anti-copy dossier with collaboration-specific risks.
8. Update the final Markdown synthesis and the final PPTX.

The study is exhaustive at the research level but does not decide the
collaboration MVP yet. MVP selection will happen after the extension has
captured evidence.

## 4. Corpus Scope

The corpus must be broad, then filtered by license and ERP/CRM alignment.

Mandatory proprietary references, public benchmark only:

- Notion;
- ClickUp;
- Airtable;
- Monday.com;
- Asana;
- Slack and Microsoft Teams where team communication patterns matter.

Initial open source and source-available candidates to verify:

| Candidate | Primary angle | Initial license posture to verify |
| --- | --- | --- |
| AFFiNE | docs, canvas, workspace, databases | community claims require source-level license verification |
| AppFlowy | Notion-like workspace, docs, databases, boards | AGPL functional reference unless a permissive component is isolated |
| Baserow | database/workspace, internal tools, automations | MIT/open-core boundary to verify |
| BookStack | wiki and knowledge base | MIT candidate |
| Docmost | collaborative wiki/docs | AGPL functional reference |
| Focalboard | boards, tasks, lightweight project management | mixed historical license evidence to verify |
| Huly | all-in-one project, docs, chat, planning | EPL/source boundary to verify |
| Logseq | local-first knowledge management | AGPL functional reference |
| Mattermost | team communication and workflows | mixed open-core/source license boundary to verify |
| NocoDB | Airtable-like database workspace | source-available posture to verify |
| OpenProject | project and work packages | already in corpus; extend collaboration angle |
| Outline | knowledge base | BSL/source-available functional benchmark |
| Plane | project/work management, docs, triage | AGPL functional reference |
| Rocket.Chat | chat and omnichannel communication | MIT/open-core boundary to verify |
| Taiga | agile project management | MPL candidate, cautious inspiration |
| Vikunja | tasks and project management | license and maturity to verify |
| Zulip | threaded team communication | Apache-2.0 candidate |

The execution plan may add or remove candidates when current evidence supports
the change. Every candidate must record repository URL, official site, checked
revision or release, date checked, license evidence, and reuse classification.

Initial public evidence checked during design, to be re-verified during
execution:

- Outline GitHub currently presents Business Source License 1.1 language for the
  main product repository.
- AppFlowy GitHub currently presents AGPLv3 language for the main product
  repository.
- Plane GitHub currently presents AGPLv3 language for the main product
  repository.
- Baserow GitHub currently presents an MIT/open-core posture for non-premium
  and non-enterprise features.
- Docmost GitHub currently presents AGPL-3.0 core language plus enterprise
  directories.
- Zulip GitHub currently presents Apache-2.0 licensing.
- Anytype public repositories currently present a source-available client
  license while some supporting components are MIT; this requires component-level
  handling if studied.

## 5. License And Anti-Copy Policy

The target product remains MIT. The extension must favor projects that are
freely reusable under the existing criteria: MIT, Apache-2.0, BSD, and similarly
permissive licenses.

Treatment by license family:

- MIT, Apache-2.0, BSD: eligible for deeper technical inspiration if the
  relevant files are covered and attribution obligations are tracked.
- MPL, LGPL, EPL, and mixed open-core projects: cautious inspiration only after
  explicit license review.
- GPL and AGPL: functional reference only.
- BSL, Sustainable Use, source-available, proprietary, and commercial-only
  material: public benchmark or functional reference only; no technical reuse.

The collaboration domain has specific anti-copy risk because product expression
is often visible and recognizable. The study must not copy or closely adapt:

- editor UI text, slash commands, block labels, empty states, onboarding copy,
  templates, icons, illustrations, demo spaces, or screenshots;
- document schemas, block model names, database/view structures, API names, or
  workspace object names that are unusually specific to one product;
- test fixtures, example workspaces, seed data, import/export templates, or
  automation recipes;
- proprietary UX flows from Notion, ClickUp, Airtable, Monday.com, Asana,
  Slack, or Microsoft Teams.

Permitted output is rewritten functional analysis: workflows, domain concepts,
business rules, integration expectations, permission needs, and acceptance
criteria expressed in OpenERP's own words.

## 6. Graphify Use

Graphify must remain targeted. The extension should not run Graphify across the
entire raw corpus.

Recommended Graphify targets:

- one permissive knowledge/workspace candidate, if license verification confirms
  it is suitable;
- one permissive work-management or task candidate, if found;
- one permissive communication candidate, with Zulip as an initial candidate;
- Baserow if its MIT/open-core boundary is confirmed and the database/workspace
  model appears useful for ERP/CRM custom views;
- selected non-permissive candidates only when their functional architecture is
  critical and the anti-copy dossier explicitly keeps them out of technical
  reuse.

Each Graphify run must capture repository URL, branch/tag/commit, license files,
included modules, generated HTML/JSON/report artifacts, extraction notes, and
limitations.

## 7. Functional Questions To Answer

The extension must answer these product questions:

- What collaboration capabilities are necessary for CRM, project delivery,
  billing, support, manufacturing, maintenance, and management workflows?
- Which capabilities belong in foundation versus CRM/project modules?
- Which capabilities should remain integrations with external tools?
- Which document/page model is sufficient for ERP/CRM without building a full
  Notion clone?
- Which task/work-management model is sufficient without building a full
  ClickUp clone?
- How should comments, mentions, notifications, decisions, files, and audit
  events interoperate?
- What bilingual FR/EN requirements affect collaboration text, notifications,
  templates, and search?
- What permission model is needed for customer-visible versus internal
  collaboration?
- What self-hosted/Kubernetes requirements appear in the collaboration
  candidates?

## 8. Expected Deliverables

The extension must deliver:

1. Updated corpus report and candidates CSV entries for collaboration products.
2. New fiches for selected collaboration candidates.
3. Updated shortlist with collaboration-specific recommendations.
4. Graphify artifacts and summaries for selected candidates.
5. Collaboration functional map linked to the existing ERP/CRM map.
6. MVP recommendation addendum for collaboration.
7. Anti-copy addendum for collaboration-specific expression risk.
8. Updated final Markdown synthesis.
9. Updated final PPTX synthesis.

Suggested paths:

- `docs/study/02-fiches/<candidate>.md` for new fiches;
- `docs/study/05-graphify/<candidate-scope>/summary.md` for Graphify summaries;
- `docs/study/06-functional-map/collaboration-functional-map.md`;
- `docs/study/07-mvp/collaboration-mvp-addendum.md`;
- `docs/study/08-anti-copy/collaboration-anti-copy-addendum.md`;
- `docs/study/11-final-package/final-synthesis.md`;
- `docs/study/11-final-package/openerp-final-synthesis.pptx`.

## 9. Reporting Format

Every progress checkpoint must keep the established three-line format:

```text
Fait: completed artifacts and verified facts.
À faire: remaining work and approximate completion percent.
Attendu: decision or action needed, with a recommendation.
```

The percentage is an approximate completion indicator for the current extension,
not a formula.

## 10. Visual Companion Use

Use the visual companion and Playwright checks only where visual evidence helps:

- collaboration capability map;
- ERP/CRM object collaboration diagram;
- Notion/ClickUp-inspired but original workspace information architecture;
- PPTX preview and layout checks;
- any mock screen that helps decide scope.

Text-only decisions should remain in terminal messages.

## 11. Execution Guardrails

The execution plan must keep the extension separate from application
implementation. This phase studies and writes specs; it does not implement
collaboration features.

Before any final extension claim, run these checks:

- corpus and fiche paths exist;
- candidate licenses are recorded with source evidence;
- Graphify artifacts are listed where generated;
- final synthesis Markdown is updated;
- PPTX exists and opens or can be inspected programmatically;
- no forbidden comparative point system language is introduced;
- anti-copy rules explicitly cover collaboration-specific expression risk;
- git history uses atomic commits and pushes to `main`.
