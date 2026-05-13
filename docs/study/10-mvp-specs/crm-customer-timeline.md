# MVP Spec: CRM And Customer Timeline

## Progress

Fait: spec drafted + enrichissement 2026-05-12 (12 décisions D-CRM-01→12, 12 écrans CRM-S01→S12, 3 anti-copy hotspots Twenty/Odoo/HubSpot flaggés). Décisions clés remontées au decision-pack : custom fields JSON+declarative (ferme mimic Twenty), multi-currency par opportunité, frontière CRM/Billing QuoteHandoff.
À faire: arbitrage porteur produit via `decision-pack.md` (C-1 à C-5 + PG-06 canon Activity), puis correction `pipeline_stage.{tenant_stage_id}.fr` en table dédiée (désaccord reviewer), puis gravage inline.
Attendu: foundation arbitré en premier (multi-tenant + canon entités) avant de figer CRM ; lien projet ↔ opportunité 1:N à confirmer avec project spec.

## Objective

Create a service-company CRM that supports the first commercial workflow:

1. capture a company or contact;
2. qualify a lead;
3. manage an opportunity through a configurable pipeline;
4. record activities and customer timeline entries;
5. produce a quote/offer handoff;
6. convert accepted work into a contract, subscription, or project in later modules.

The CRM must be original. Twenty and Odoo inform capability coverage, but the implementation must not copy their schema names, workflow internals, UI wording, generated clients, or package structure.

## Roles

| Role | Responsibilities |
| --- | --- |
| Sales lead | Owns pipeline, companies, contacts, opportunities, activities, and quote handoff. |
| Sales manager | Reviews team pipeline, reassigns opportunities, approves sensitive changes, and sees team activity. |
| Project manager | Reads accepted opportunities and customer context before project creation. |
| Finance user | Reads customer billing identity and accepted commercial terms when invoicing begins. |
| Standard user | Reads assigned customer records and logs activities where permitted. |
| External customer user | No CRM access in MVP except future portal-specific views. |

## Data Entities

| Entity | Required Fields |
| --- | --- |
| `Company` | id, organization_id, display_name, legal_name, status, owner_user_id, team_id, website, phone, email, billing_address, shipping_address, language, tax_region, created_at, updated_at. |
| `Contact` | id, organization_id, company_id, display_name, first_name, last_name, title, email, phone, language, status, owner_user_id, created_at, updated_at. |
| `Lead` | id, organization_id, source, display_name, company_name, contact_name, email, phone, description, status, owner_user_id, team_id, created_at, converted_at. |
| `Opportunity` | id, organization_id, company_id, primary_contact_id, name, stage_id, status, owner_user_id, team_id, expected_value, currency, expected_close_date, probability_band, service_summary, loss_reason, created_at, updated_at. |
| `PipelineStage` | id, organization_id, name, order_index, is_initial, is_won, is_lost, required_fields, active. |
| `Activity` | id, organization_id, resource_type, resource_id, activity_type, subject, due_at, completed_at, owner_user_id, outcome, next_step, created_at. |
| `TimelineEntry` | id, organization_id, company_id, contact_id, opportunity_id, entry_type, actor_user_id, summary_key, payload, occurred_at. |
| `CustomerTag` | id, organization_id, name, color_token, active. |
| `CustomerImportJob` | id, organization_id, source_filename, status, mapping, validation_summary, created_by, created_at, completed_at. |
| `QuoteHandoff` | id, organization_id, opportunity_id, target_type, status, requested_by, accepted_at, created_at. |

## States

### Lead Status

| State | Meaning |
| --- | --- |
| `new` | Captured but not qualified. |
| `working` | Assigned and being qualified. |
| `converted` | Converted to company/contact/opportunity. |
| `disqualified` | Not currently actionable. |

### Opportunity Status

| State | Meaning |
| --- | --- |
| `open` | Active commercial work. |
| `won` | Accepted and ready for quote/contract/project handoff. |
| `lost` | Closed without sale, with reason required. |
| `archived` | Hidden from active pipeline without deleting history. |

### Activity Status

| State | Meaning |
| --- | --- |
| `planned` | Due in future or not completed. |
| `done` | Completed with outcome. |
| `cancelled` | Cancelled with reason. |
| `overdue` | Derived state when due_at is in past and not done/cancelled. |

## Permission Model

Required CRM permissions:

- `crm.company.read.own|team|organization`
- `crm.company.write.own|team|organization`
- `crm.contact.read.own|team|organization`
- `crm.contact.write.own|team|organization`
- `crm.lead.write.own|team|organization`
- `crm.opportunity.read.own|team|organization`
- `crm.opportunity.write.own|team|organization`
- `crm.opportunity.approve.team|organization`
- `crm.import.manage.organization`
- `crm.timeline.read.own|team|organization`
- `crm.pipeline.manage.organization`

Rules:

- ownership gives ordinary read/write only within the assigned scope;
- sales managers can reassign records inside their team scope;
- changing an opportunity to `won` can require approval when expected value exceeds tenant threshold;
- viewing finance-sensitive fields requires a finance permission or approved role bridge;
- import jobs require organization-level CRM import permission.

## Workflows

### Lead Capture And Conversion

1. User creates lead manually or by import.
2. System validates minimum contact information.
3. Owner qualifies lead and records activity.
4. Conversion creates or links company/contact.
5. Conversion creates opportunity when commercial work exists.
6. Timeline records original lead source and conversion action.

### Opportunity Pipeline

1. User creates opportunity under company and primary contact.
2. Opportunity starts in initial pipeline stage.
3. User changes stages as qualification progresses.
4. Required fields are enforced per stage.
5. Activities and notes are logged against opportunity and company timeline.
6. Opportunity becomes `won` or `lost`.
7. Won opportunity creates quote/contract/project handoff record.

### Customer Timeline

1. System writes timeline entries for lead conversion, stage changes, ownership changes, quote handoffs, major activities, and imports.
2. Users can add notes/comments where permitted.
3. Timeline supports filtering by entry type, actor, date, opportunity, and visibility.
4. Sensitive finance/HR entries are hidden unless caller has matching module permission.

### Customer Import

1. User uploads CSV/XLSX.
2. System creates import job and detects columns.
3. User maps fields to company/contact/lead fields.
4. System validates required fields, duplicates, language values, country/province, email format, and owner/team.
5. User reviews validation summary.
6. System imports accepted rows and records rejected rows.
7. Import job emits timeline entries and audit event.

## Business Rules

- A company can exist without contacts; an opportunity requires either a company or a conversion path from lead.
- A contact can belong to one primary company in MVP.
- Duplicate detection must warn on company name/domain, contact email, and phone where available.
- Deleting CRM records is soft-delete and must not remove timeline history.
- Lost opportunities require a reason.
- Won opportunities cannot be edited materially after quote/contract handoff without reopening or creating a revision note.
- Stage changes create timeline entries.
- Owner/team changes create audit events.
- Import jobs are auditable and replay-resistant.
- Display text is FR/EN through translation keys.
- Customer language is stored separately from user language and used by later document/email workflows.

## API Expectations

Initial API surface:

- `GET /crm/companies`
- `POST /crm/companies`
- `GET /crm/companies/{id}`
- `PATCH /crm/companies/{id}`
- `GET /crm/contacts`
- `POST /crm/contacts`
- `PATCH /crm/contacts/{id}`
- `GET /crm/leads`
- `POST /crm/leads`
- `POST /crm/leads/{id}/convert`
- `GET /crm/opportunities`
- `POST /crm/opportunities`
- `PATCH /crm/opportunities/{id}`
- `POST /crm/opportunities/{id}/stage-changes`
- `POST /crm/opportunities/{id}/close-won`
- `POST /crm/opportunities/{id}/close-lost`
- `GET /crm/timeline`
- `POST /crm/activities`
- `PATCH /crm/activities/{id}`
- `POST /crm/import-jobs`
- `POST /crm/import-jobs/{id}/validate`
- `POST /crm/import-jobs/{id}/commit`
- `GET /crm/pipeline-stages`
- `PATCH /crm/pipeline-stages`

API rules:

- all list endpoints support pagination, filters, and stable ordering;
- writes return affected resource id and audit/timeline event ids where applicable;
- stage transitions validate required fields and permission;
- import commit must be idempotent by import job id;
- no endpoint returns hidden fields outside caller permissions.

## Events

Required domain events:

- `crm.company.created`
- `crm.company.updated`
- `crm.contact.created`
- `crm.lead.created`
- `crm.lead.converted`
- `crm.opportunity.created`
- `crm.opportunity.stage_changed`
- `crm.opportunity.owner_changed`
- `crm.opportunity.won`
- `crm.opportunity.lost`
- `crm.activity.created`
- `crm.activity.completed`
- `crm.import.completed`
- `crm.quote_handoff.requested`

Events feed audit, timeline, notifications, reporting, and automation.

## Localization Requirements

- Pipeline stage display names are tenant-configurable and must have FR/EN labels.
- Lead sources, loss reasons, activity types, and customer tags require FR/EN labels.
- Customer preferred language must be captured and inherited into quote/document handoff.
- Import validation messages must be localized.
- Names, addresses, phone numbers, province/state, and country fields must support Canada/Quebec use without hard-coding a single country.

## Reporting Requirements

MVP CRM reporting should include:

- open opportunities by stage;
- opportunities by owner/team;
- won/lost opportunities by period;
- overdue activities;
- lead conversion count by source;
- customer records missing key fields;
- import validation summary.

No advanced BI authoring is required in CRM MVP.

## Acceptance Tests

- A user with `crm.company.write.own` can create a company assigned to self.
- A user with own scope cannot view another team member's private opportunity.
- A manager with team scope can reassign an opportunity inside the team.
- Lead conversion creates linked company/contact/opportunity records without duplicating the original lead.
- Lost opportunity requires a loss reason.
- Won opportunity creates a quote handoff event.
- Stage change with missing required fields is rejected.
- Stage change writes timeline entry.
- Owner change writes audit event.
- Customer import validates duplicate email before commit.
- Import commit is idempotent for the same job id.
- CRM list endpoint hides records outside permission scope.
- FR and EN labels exist for pipeline stages, activity types, and loss reasons.
- Customer preferred language is carried into quote handoff payload.

## Non-Goals

- No email/calendar sync in MVP CRM; manual activity capture first.
- No marketing automation or campaign builder.
- No general custom object engine in CRM MVP.
- No copied Twenty object metadata model, GraphQL operations, workflow names, or UI labels.
- No copied Odoo lead/opportunity schemas, XML views, reports, or workflow text.

## Agentic Impacts

Agentic support adds supervised lead qualification, follow-up preparation, timeline summaries, proposed activities, language-aware customer communication and audit-visible human validation to CRM; the consolidated impact map is in [`docs/study/10-mvp-specs/agentic-impacts.md`](agentic-impacts.md).

## Enrichment 2026-05-12

### Functional Depth

#### User Stories

- US-CRM-01 — As a sales lead, I capture an inbound lead from a web form or manual entry so that the lead is owned, traceable, and reaches qualification within one business day without dropping into a shared inbox.
- US-CRM-02 — As a sales lead, I convert a qualified lead into a company, primary contact, and opportunity in one action so that the customer timeline starts on first qualification and no information is rekeyed.
- US-CRM-03 — As a sales manager, I move an opportunity through configurable pipeline stages and trigger required-field checks so that pipeline data quality is enforced before each stage advance instead of cleaned up at quarter end.
- US-CRM-04 — As a project manager, I read the customer timeline of a won opportunity (without sales write access) so that I have context for kickoff without asking the sales lead for a verbal brief.
- US-CRM-05 — As a finance user, I see only finance-relevant customer fields (billing identity, accepted commercial terms, currency, language) so that I can invoice without inheriting the full sales-conversation history.

#### Golden Path: Lead To Quote Handoff

1. Lead capture. An inbound lead arrives via manual entry (Sales lead role) or web-form payload through `POST /crm/leads`. The lead is created with `status = new`, an automatic owner (round-robin or default team) and a `TimelineEntry` of type `lead.captured` carrying `source`, `actor_user_id` (or `actor = system` for web form), and `occurred_at`. FR/EN source label is stored as a translation key, not free text.
2. Acknowledgement. System emits `crm.lead.created`; downstream notification fans out to owner. Owner sees lead in their queue with overdue indicator if not touched within tenant SLA (default 24h).
3. Qualification. Owner edits lead status to `working`, logs an `Activity` of type `call.discovery`, completes it with an outcome and a next step. Each activity creation/completion produces `crm.activity.created` then `crm.activity.completed` and writes a `TimelineEntry` of type `activity.completed` linked to the (future) opportunity once it exists.
4. Conversion. Owner triggers `POST /crm/leads/{id}/convert`. Server transaction: resolve-or-create `Company` on domain + legal name dedup; resolve-or-create primary `Contact` on email dedup; create `Opportunity` linked to both, with `stage_id = initial`, `currency` inherited from `Company.tax_region` default, `expected_value` from lead description if parseable, otherwise null. Lead transitions to `converted` and is soft-locked. Timeline entries: `lead.converted`, `company.created` (if new), `contact.created` (if new), `opportunity.created`. Event chain: `crm.lead.converted` then `crm.opportunity.created`.
5. Pipeline progression. Owner advances `Opportunity` through stages via `POST /crm/opportunities/{id}/stage-changes`. Each transition validates `PipelineStage.required_fields`. On failure, server returns `422` with localized error keys and writes no timeline entry. On success, `crm.opportunity.stage_changed` fires and `TimelineEntry` of type `opportunity.stage_changed` is written with `from_stage`, `to_stage`, and `actor_user_id`.
6. Activity loop. Owner logs further activities (calls, meetings, notes) and reads the consolidated timeline at the company level and at the opportunity level. Timeline filters by `entry_type`, `actor_user_id`, date range, opportunity id.
7. Won closure. Owner triggers `POST /crm/opportunities/{id}/close-won` with mandatory expected value, currency, expected close date, and service summary. If expected value exceeds tenant approval threshold, server returns `409` with `requires_approval = true` and notifies a sales manager; manager approval re-runs the close-won call. On success, opportunity status becomes `won`, a `QuoteHandoff` record is created with `status = requested` and `target_type = quote`, events `crm.opportunity.won` and `crm.quote_handoff.requested` fire, timeline gets `opportunity.won` and `quote.handoff_requested` entries. Customer language is included in the handoff payload.
8. Handoff. Billing module picks up the handoff event (out of scope for CRM MVP; covered by billing spec). CRM exposes read API for handoff state to keep the timeline accurate.

#### Edge Cases

- EC-01 Duplicate lead on capture. Two leads with same email arrive within 5 minutes. System creates both but emits a `crm.lead.created` event tagged with `dedup_candidate_ids` (warn not block). Owner sees a merge suggestion in lead detail. Merge is a manual workflow that preserves the older lead and its timeline; the newer one is soft-deleted with a `lead.merged_into` timeline entry.
- EC-02 Opportunity reassigned during edit. User A is editing opportunity X. Sales manager reassigns it to User B (writes `owner_user_id`). User A submits a PATCH with stale `updated_at`. Server returns `409 conflict` with current owner and last updated marker. User A sees a banner with the change before retry.
- EC-03 Import CSV row errors. A 5,000-row import has 47 rows failing duplicate-email and 12 rows failing missing-language. `POST /crm/import-jobs/{id}/validate` returns a structured summary (`error_code`, `row_index`, `column`, `localized_message`). User can either fix and re-upload, or commit only valid rows. Commit must be idempotent so re-runs do not duplicate.
- EC-04 Timeline page during connection loss. User scrolls company timeline; network drops mid-pagination. Client surfaces a non-blocking warning and retries with the last seen cursor. No timeline write happens client-side. On reconnect, the timeline catches up and shows newly arrived entries above the fold with a "new entries" indicator.
- EC-05 FR/EN simultaneous tenants. Tenant has both FR and EN active users. A sales lead in FR creates a pipeline stage. Stage display name is captured via two translation keys (`pipeline_stage.{tenant_stage_id}.fr` and `.en`). Until the EN key is filled, EN users see a placeholder banner ("translation pending"); the stage still works functionally. Required-field labels follow the user's preferred language at render time.
- EC-06 Loss reason missing. A user closes an opportunity as `lost` without selecting a loss reason. Server returns `422` with localized error. Form blocks submission. Audit/timeline are not written.
- EC-07 Permission boundary on timeline. A standard user reads the company timeline. Timeline entries with `payload.sensitivity = finance` are filtered out at API level (not just hidden in UI). Counts reflect the visible subset; an explanatory "some entries hidden" indicator appears with localized text.

#### Acceptance Criteria

- AC-F-01 Converting a lead always creates exactly one opportunity and never duplicates the original company when domain match succeeds (verified by integration test on `POST /crm/leads/{id}/convert`).
- AC-F-02 A stage change to a stage with required fields missing returns `422` with an error array indexed by field name; no `crm.opportunity.stage_changed` event is emitted and no timeline entry is written (verified by API contract test).
- AC-F-03 Close-won above approval threshold returns `409 requires_approval` and notifies one sales manager; approval flow logs both the requester and approver in the resulting timeline entry.
- AC-F-04 Importing 1,000 rows twice with the same `import_job_id` produces exactly 1,000 records (idempotency).
- AC-F-05 Timeline filter by `entry_type = opportunity.stage_changed` returns only stage transitions and is stable-ordered by `occurred_at DESC` then `id`.
- AC-F-06 FR and EN labels are present for every default pipeline stage, lead source, activity type, and loss reason shipped in the tenant seed.
- AC-F-07 A user without `crm.opportunity.read.team` cannot list another user's opportunity by id (`404 not_found`, not `403`).

### Cross-ERP Benchmark

License posture reminder: Twenty, EspoCRM, SuiteCRM, Frappe CRM = AGPL, functional reference only. Odoo CRM = LGPL, cautious inspiration in abstraction only. No schema, table name, field name, UI label or code structure is reused from any source. The Posture Applied column states how each capability is treated in this MVP.

| Capability | Twenty | Odoo CRM | EspoCRM | SuiteCRM | Frappe CRM | Posture Applied |
| --- | --- | --- | --- | --- | --- | --- |
| Lead capture (manual + form) | Present | Present | Present | Present | Present | Table stakes — original implementation, no reused field names |
| Lead-to-opportunity conversion | Present | Present | Present | Present | Present | Table stakes — independent semantics |
| Configurable pipeline (stages + required fields) | Present | Present | Present | Present | Present | Table stakes — internal model only |
| Activity logging (call, meeting, task, note) | Present | Present | Present | Present | Present | Table stakes |
| Customer timeline / chatter / activity feed | Present | Present (Chatter pattern) | Present | Partial | Present | Functional reuse — anti-copy hotspot on chatter naming and event taxonomy |
| Custom fields (user-defined columns) | Present (metadata engine) | Present (Studio, premium-leaning) | Present | Present | Present | Skip in MVP — JSON column only; metadata engine is post-MVP and an anti-copy hotspot vs Twenty |
| CSV import wizard with mapping | Partial | Present | Present | Present | Partial | Functional reuse — original wizard, no copied step labels |
| Email capture (IMAP/SMTP, inbound parsing) | Present | Present | Present | Present | Partial | Skip in MVP — manual activity capture only |
| Deduplication suggestions | Partial | Present | Partial | Partial | Partial | Functional reuse — domain+email warn, no block |
| Team / ownership scoping (own/team/org) | Present | Present | Present | Present | Present | Table stakes — independent permission grammar |
| Kanban opportunity board | Present | Present | Partial | Partial | Present | Functional reuse — anti-copy hotspot on board interaction details |
| Loss reason capture | Partial | Present | Partial | Present | Partial | Table stakes — mandatory at close-lost |

Anti-copy hotspots (the three highest-risk areas where Twenty/Odoo CRM patterns are most distinctive):

- Twenty's object-metadata engine and SDK-generated client. MVP avoids by using static JSON for custom fields instead of a metadata-driven engine.
- Odoo's "Chatter" timeline pattern and its mail.thread mixin. MVP avoids by naming the entity `TimelineEntry`, by not mirroring Odoo's message-vs-log distinction, and by not reusing message-type vocabulary.
- Odoo's lead-vs-opportunity unified model with kanban stage transitions. MVP makes the lead/opportunity boundary explicit and uses a separate `convert` endpoint rather than an in-place state transition.

### UI Screen Inventory

All screen names are internal project names. No UI label, screen title, or section heading from Twenty, Odoo CRM, HubSpot, Salesforce, EspoCRM, SuiteCRM, or Frappe CRM is reused. Labels shown below are bilingual placeholders illustrating the localization contract; actual production labels live in translation files.

| Screen Code | Internal Name | Purpose | Data Shown | Actions | UI Components | Inspiration (functional only) | FR / EN labels |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CRM-S01 | Lead queue | Triage inbound leads | Lead list with status, source, owner, age | Open, assign, qualify, convert, disqualify | Filterable data table, status pill, owner avatar, age badge | Lead-list pattern (common across CRMs) | "File des prospects" / "Lead queue" |
| CRM-S02 | Lead detail | Qualify a single lead | Lead fields, source, originating payload, activities, dedup suggestions | Edit, log activity, convert, merge, disqualify | Two-column form, side activity composer, dedup banner | Lead-detail pattern | "Fiche prospect" / "Lead detail" |
| CRM-S03 | Pipeline board | Visualize opportunities by stage | Cards grouped by stage; value, owner, expected close | Drag to change stage, open card, filter, group-by | Column board with drop zones, card with badges, stage-required-field warning | Kanban board (functional reuse, anti-copy hotspot) | "Tableau pipeline" / "Pipeline board" |
| CRM-S04 | Opportunity detail | Manage a single opportunity | Opportunity fields, stage history, activities, linked company/contact, timeline | Edit, change stage, log activity, close-won, close-lost, reassign | Header summary, stage stepper, tabs (timeline, activities, details), composer | Opportunity-detail pattern | "Fiche opportunité" / "Opportunity detail" |
| CRM-S05 | Company profile | Customer 360 view | Company fields, primary contact, opportunities, activities, full timeline, tags | Edit, add contact, add opportunity, add tag, view timeline | Header, related-records tabs, timeline list, tag chips | Customer-360 pattern | "Fiche entreprise" / "Company profile" |
| CRM-S06 | Contact list | Browse individuals | Contact list with company, role, owner | Open, edit, log activity | Filterable data table | Contact-list pattern | "Liste contacts" / "Contact list" |
| CRM-S07 | Contact detail | Edit a contact and view related activities | Contact fields, related opportunities, activities | Edit, log activity, change company link | Form, related activities side panel | Contact-detail pattern | "Fiche contact" / "Contact detail" |
| CRM-S08 | Timeline view | Read-only consolidated timeline | All `TimelineEntry` rows filtered by company or opportunity | Filter by type/actor/date, expand entry payload | Vertical timeline, type icons, filter chips | Activity-feed pattern (anti-copy hotspot vs Odoo Chatter) | "Historique client" / "Customer timeline" |
| CRM-S09 | Activity composer | Log an activity inline | Activity type, subject, due date, outcome, next step | Save planned, save done, cancel | Slide-over panel, type selector, datetime, rich text | Activity-composer pattern | "Composer activité" / "Activity composer" |
| CRM-S10 | Import wizard | Upload and map customer data | Upload step, mapping step, validation step, commit step | Upload, map columns, validate, commit | Step indicator, file dropzone, mapping table, error table | CSV-import-wizard pattern | "Assistant import" / "Import wizard" |
| CRM-S11 | Pipeline admin | Configure stages and required fields | Stage list, required fields, FR/EN labels | Add stage, reorder, edit, deactivate | Sortable list, side editor with translation tabs | Configuration screen pattern | "Administration pipeline" / "Pipeline admin" |
| CRM-S12 | Team and ownership admin | Manage team scopes and reassignments | Team list, user assignments, bulk reassignment | Reassign, change scope | Table with bulk actions | Team-admin pattern | "Administration équipes" / "Team admin" |

Localization rule: every screen renders labels from translation keys; no English-only string is hardcoded; FR and EN parity is enforced at build time by a label-key audit.

### Tech Layer Options

#### Decision T-01 — Lead and Opportunity Model

- Context. Two operational realities (early unqualified contact vs active commercial pursuit) need clear semantics. AGPL ecosystems (Twenty) keep `Lead` and `Opportunity` distinct. LGPL Odoo merges them with a discriminator (`type = lead` vs `opportunity`). HubSpot uses unified `deal` plus separate `contact`.
- Options.
  1. Separate entities. Pros: clear API, explicit lifecycle, easy permission model. Cons: requires a conversion step and a join when reporting on funnel from origination.
  2. Unified with discriminator. Pros: single table, simpler reporting. Cons: mirrors Odoo's pattern too closely (anti-copy hotspot), permission and required-fields logic per type still needed.
  3. Unified without discriminator (HubSpot deal-only). Pros: simplest model. Cons: loses lead-qualification semantics and audit clarity on "when did this become real".
- Recommendation. Option 1 (separate entities). Already in the spec. Reinforces anti-copy posture vs Odoo and matches roles section.
- Dependencies. Conversion endpoint (`POST /crm/leads/{id}/convert`), timeline event chain, dedup logic at conversion time.

#### Decision T-02 — Pipeline Stage Scope

- Context. Stage configuration needs to balance per-tenant flexibility with reporting consistency.
- Options.
  1. Global stages per tenant. Pros: simple, comparable reports across teams. Cons: cannot reflect different sales motions per team.
  2. Per-team stages. Pros: matches multi-team service organizations. Cons: harder cross-team reporting, more configuration UI.
  3. Per-user stages. Pros: maximum flexibility. Cons: unusable for management reporting and noisy timeline.
- Recommendation. Option 1 globally for MVP, with `team_id` on `PipelineStage` reserved (nullable) for post-MVP per-team extension. Avoids a schema migration later.
- Dependencies. Stage admin screen (CRM-S11), reporting (open opportunities by stage).

#### Decision T-03 — Activity vs Task

- Context. Sales people log calls, meetings, notes, and have to-dos. Twenty separates `Task` from `Activity`. Odoo unifies under `mail.activity` and `mail.message`. Frappe CRM splits per doctype.
- Options.
  1. Distinct entities `Activity` and `Task`. Pros: clean semantics. Cons: duplicates concerns (due_at, owner, outcome) and forces clients to query two endpoints.
  2. Unified `Activity` with `activity_type` covering call, meeting, note, task. Pros: one event stream into the timeline, simpler client. Cons: type-specific fields go into a payload column.
  3. Polymorphic with shared base. Pros: typed columns per subtype. Cons: schema complexity.
- Recommendation. Option 2 (unified `Activity` with `activity_type`). Already in the spec. The `payload`-style fields (`outcome`, `next_step`, free-form subject) cover the variation. Anti-copy bonus vs Odoo's mail.message/mail.activity split.
- Dependencies. Activity composer (CRM-S09), timeline taxonomy.

#### Decision T-04 — Custom Fields Implementation

- Context. Customers will want extra fields on `Company`, `Contact`, `Opportunity`. Twenty has a heavyweight `ObjectMetadata`/`FieldMetadata` engine (anti-copy hotspot). Odoo uses `ir.model.fields` (LGPL plumbing, anti-copy risk too).
- Options.
  1. Native columns via `ALTER TABLE`. Pros: typed, indexable. Cons: per-tenant migrations are costly, locks at high scale, requires DDL privileges.
  2. JSON column `custom_fields jsonb`. Pros: zero-migration, simple. Cons: no typed indexes by default, validation in app layer.
  3. Metadata-driven engine (Twenty-style). Pros: most flexible, supports views and SDK generation. Cons: complex, slow to ship, and direct anti-copy hotspot vs Twenty even with rewritten code.
- Recommendation. Option 2 (JSON column) for MVP. Add per-field metadata (label FR/EN, type, validation) in a side `CustomFieldDefinition` table — purely declarative, not a runtime engine. Defer engine-style features to post-MVP if a real need emerges.
- Dependencies. Field admin screen (post-MVP), import wizard mapping, anti-copy review.

#### Decision T-05 — Timeline Event Taxonomy

- Context. `TimelineEntry.entry_type` needs to be stable for filtering and reporting, but extensible because new modules (billing, project) will write into the same timeline.
- Options.
  1. Strict enum maintained in code. Pros: type safety, predictable filters. Cons: every new module needs a code change.
  2. Free-text labels. Pros: anything writes any event. Cons: timeline becomes a swamp, filtering unreliable.
  3. Hybrid: namespaced category + free sub-label. Pros: predictable top-level categories (`lead.*`, `opportunity.*`, `activity.*`, `quote.*`), modules add sub-labels. Cons: requires a small validator.
- Recommendation. Option 3 (hybrid). Spec already aligns with this: `entry_type` follows a dotted pattern (`opportunity.stage_changed`, `lead.converted`, etc.). Document the grammar (`<module>.<entity>.<verb>`).
- Dependencies. Event bus, timeline filter UI, downstream module specs (billing, project).

#### Decision T-06 — CSV Import (Wizard vs API-only)

- Context. Spec already requires a wizard. Trade-off is whether MVP ships UI mapping or only an API endpoint plus a thin upload form.
- Options.
  1. Full wizard UI (upload, map, validate, commit). Pros: usable by non-technical users. Cons: more frontend work.
  2. API-only with downloadable CSV template. Pros: faster to ship. Cons: shifts work to consultants or technical admins.
  3. Hybrid: ship template-driven upload UI first, full mapping wizard later. Pros: reduces frontend cost without blocking non-technical users. Cons: template rigidity may frustrate large data sets.
- Recommendation. Option 1 (full wizard), as already specified in the workflows section. The validation summary step is the highest-value piece because it surfaces bilingual error messages and dedup conflicts before commit. Idempotency by `import_job_id` is mandatory.
- Dependencies. CRM-S10, validation rule catalog, idempotency design.

#### Decision T-07 — Email Capture and Enrichment

- Context. Email is the primary sales channel. Twenty, Odoo, EspoCRM, SuiteCRM all support inbound email capture. Spec already declares email/calendar sync a non-goal for MVP.
- Options.
  1. Skip in MVP (manual activity capture only). Pros: ships fastest, no IMAP/IDLE plumbing. Cons: loses automation value.
  2. Post-MVP via inbound webhook (mail provider routes a JSON event). Pros: simpler than IMAP polling, modern. Cons: depends on a provider integration.
  3. Post-MVP via IMAP polling. Pros: provider-agnostic. Cons: stateful, error-prone, security review needed.
- Recommendation. Option 1 for MVP, plan Option 2 for v1.1 once a provider is selected. Keep `Activity.activity_type = email.inbound` reserved so future ingestion does not require schema change.
- Dependencies. Non-goals section already covers this; reservation in activity type catalog needed.

### Decision Register

```yaml
- id: D-CRM-01
  topic: Lead vs Opportunity model
  decision: Separate Lead and Opportunity entities with explicit conversion endpoint
  status: accepted
  date: 2026-05-12
  rationale: Clear semantics, easier permission model, reinforces anti-copy posture vs Odoo unified type discriminator
  alternatives_considered:
    - Unified with discriminator (Odoo-style) — rejected: anti-copy hotspot
    - Unified without discriminator (HubSpot-style) — rejected: loses qualification semantics
  impacts: [API surface, timeline taxonomy, dedup at conversion]
  reversible: hard (data migration cost)

- id: D-CRM-02
  topic: Pipeline stage scope
  decision: Global stages per tenant; reserve nullable team_id for post-MVP per-team extension
  status: accepted
  date: 2026-05-12
  rationale: Simpler reporting, faster MVP, future-proof schema
  alternatives_considered:
    - Per-team stages — deferred to post-MVP
    - Per-user stages — rejected: unmanageable
  impacts: [pipeline admin UI, reporting]
  reversible: soft (additive)

- id: D-CRM-03
  topic: Activity vs Task entities
  decision: Unified Activity with activity_type discriminator (call, meeting, note, task)
  status: accepted
  date: 2026-05-12
  rationale: Single timeline stream, simpler client, anti-copy posture vs Odoo mail.activity/mail.message split
  alternatives_considered:
    - Distinct Activity and Task — rejected: duplicated concerns
    - Polymorphic shared base — rejected: schema overhead
  impacts: [activity composer, timeline]
  reversible: medium

- id: D-CRM-04
  topic: Custom fields implementation
  decision: JSON column custom_fields plus declarative CustomFieldDefinition table; no runtime metadata engine
  status: accepted
  date: 2026-05-12
  rationale: Avoids Twenty ObjectMetadata anti-copy hotspot and Odoo ir.model.fields plumbing; zero-migration cost
  alternatives_considered:
    - Native column ALTER TABLE — rejected: migration cost
    - Metadata-driven engine — rejected: anti-copy hotspot, scope creep
  impacts: [import wizard mapping, screen rendering, post-MVP roadmap]
  reversible: medium

- id: D-CRM-05
  topic: Timeline event taxonomy
  decision: Hybrid namespaced grammar <module>.<entity>.<verb>; validator enforces top-level categories
  status: accepted
  date: 2026-05-12
  rationale: Stable filtering, predictable reporting, extensible by downstream modules
  alternatives_considered:
    - Strict enum — rejected: blocks downstream modules
    - Free text — rejected: ungovernable
  impacts: [event bus, timeline UI, downstream specs]
  reversible: soft

- id: D-CRM-06
  topic: CSV import scope
  decision: Full wizard UI (upload, map, validate, commit) with idempotent commit by import_job_id
  status: accepted
  date: 2026-05-12
  rationale: Spec already requires it; validation step is highest-value for bilingual messages and dedup
  alternatives_considered:
    - API-only — rejected: shifts work to admins
    - Hybrid template-only — rejected: rigid
  impacts: [import wizard UI, validation catalog]
  reversible: soft

- id: D-CRM-07
  topic: Email capture in MVP
  decision: Manual activity capture only in MVP; reserve email.inbound activity type for v1.1
  status: accepted
  date: 2026-05-12
  rationale: Ships fastest, aligns with Non-Goals; future-proof reservation
  alternatives_considered:
    - Inbound webhook v1 — deferred to v1.1
    - IMAP polling — rejected for MVP: stateful and security cost
  impacts: [non-goals, activity type catalog]
  reversible: soft

- id: D-CRM-08
  topic: Tags vs Customer Segments
  decision: One concept (CustomerTag) in MVP, with optional grouping by tag.category in post-MVP
  status: accepted
  date: 2026-05-12
  rationale: Spec already has CustomerTag; segments add complexity (saved filters, refresh strategy) better served by reporting layer
  alternatives_considered:
    - Two distinct concepts (tag and segment) — deferred
  impacts: [CustomerTag entity, reporting]
  reversible: soft

- id: D-CRM-09
  topic: Quote handoff responsibility
  decision: CRM owns QuoteHandoff record (request, status, target_type); billing module owns quote document lifecycle and pricing
  status: accepted
  date: 2026-05-12
  rationale: Keeps CRM as the customer-facing workflow boundary; billing spec consumes crm.quote_handoff.requested event
  alternatives_considered:
    - Billing owns the handoff record too — rejected: blurs ownership and timeline source-of-truth
  impacts: [billing spec dependency, timeline events]
  reversible: medium

- id: D-CRM-10
  topic: Pipeline scoring
  decision: Not in MVP; probability_band field on Opportunity is informational only (no automated score)
  status: accepted
  date: 2026-05-12
  rationale: Predictive scoring requires data volume not available at MVP; manual probability_band gives forecasting baseline
  alternatives_considered:
    - Rule-based score in MVP — rejected: low ROI before data exists
  impacts: [reporting, opportunity detail UI]
  reversible: soft

- id: D-CRM-11
  topic: Multi-currency per opportunity
  decision: Yes — Opportunity.currency is mandatory and per-record; tenant default applies on creation
  status: accepted
  date: 2026-05-12
  rationale: Service companies in Quebec routinely deal in CAD and USD; deferring would force a v1.1 data migration
  alternatives_considered:
    - Tenant-single currency — rejected: blocks Quebec/Canada bilingual market reality
  impacts: [Opportunity entity, billing handoff payload]
  reversible: hard

- id: D-CRM-12
  topic: Bilingual labels on pipeline stages
  decision: Per-stage FR/EN translation keys, not a global toggle
  status: accepted
  date: 2026-05-12
  rationale: Tenants can name stages differently in each language; partial translation is allowed with a "translation pending" indicator
  alternatives_considered:
    - Global single-language stages with auto-translate — rejected: low quality, inconsistent
    - Single label fallback — rejected: regression vs spec localization requirements
  impacts: [pipeline admin UI, stage rendering, timeline rendering]
  reversible: soft
```

