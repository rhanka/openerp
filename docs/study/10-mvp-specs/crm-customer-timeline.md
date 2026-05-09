# MVP Spec: CRM And Customer Timeline

## Progress

Fait: CRM/customer timeline MVP spec drafted for companies, contacts, leads, opportunities, activities, timeline, imports, ownership, and quote/contract handoff.
À faire: Draft project/time-to-invoice, billing/accounting, and reporting/automation specs; module-spec package is about 40% complete.
Attendu: Use this CRM spec as the first customer-facing workflow contract, then connect accepted opportunities to project/time and billing specs.

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
