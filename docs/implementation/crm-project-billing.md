# CRM / Project / Billing — Shipped modules

Reference: migrations 0010–0024, `apps/api/src/{crm,project,billing}/`, `apps/web/src/routes/admin/{crm,project,billing}/`.

---

## Module summary

### CRM (migrations 0010–0014)

Lead → Company / Contact / Opportunity funnel.

- **Lead** (`crm_leads`): raw inbound signal (web form, referral, import). Soft-deletable. `convertLead` atomically creates a Company, a Contact, and an initial Opportunity and sets the lead to `converted`. Audit events: `crm.lead.created`, `crm.lead.converted`, `crm.lead.deleted`. Timeline entries mirror the audit events.
- **Company / Contact** (`crm_companies`, `crm_contacts`): canonical account entities. Both support soft-delete via `deleted_at`; default reads exclude soft-deleted rows. Audit and timeline rows are preserved after soft-delete. Soft-delete added in migration 0014 for CRM entities.
- **Opportunity** (`crm_opportunities`): lifecycle `open → won / lost`. Stage moves emit `crm.opportunity.stage_changed` and the final close emits `crm.opportunity.won` or `crm.opportunity.lost`. Stage history is also written to an h2a engagement journal (signed chain). Pipeline stages are tenant-configured.
- **Timeline** (`crm_timeline`): cross-resource read endpoint, filtered by `resourceType` + `resourceId`.

### Project (migrations 0015–0020)

Project → Task → Time → Rate / Assignment → Invoice Proposal: the time-to-invoice path.

- **Project** (`projects`): container for all project work. Soft-deletable. Status lifecycle: `active`, `on_hold`, `completed`, `cancelled`.
- **Task** (`project_tasks`): per-project work items. Completion sets `completed_at`. Soft-deletable.
- **Time Entry** (`time_entries`): billable time logged against a project + task + user. Status flow `draft → submitted → approved`. Audit events: `project.time_entry.created`, `.submitted`, `.approved`, `.deleted`.
- **Rate** (`rates`): named hourly billing rates with effective-date versioning. Active flag.
- **Assignment** (`project_assignments`): links a user to a project with an optional role label, allocation %, and a billable rate reference.
- **Invoice Proposal** (`invoice_proposals`, `invoice_proposal_lines`): a pre-billing summary generated from approved time entries for a project. Status lifecycle `draft → submitted → approved → rejected`. Soft-deletable. The `listInvoiceProposals` repo function accepts an optional `projectId`; omitting it returns all proposals tenant-wide for a given status (used by the billing pickers).

### Billing (migrations 0021–0024)

Invoice (from proposal) → payment reconciliation → data-driven taxes GST/QST → double-entry journal.

- **Invoice** (`invoices`, `invoice_lines`): the final revenue document. Can be created from scratch or converted from an approved Invoice Proposal (`/billing/invoices/from-proposal`). Status lifecycle `draft → issued → paid / partially_paid / void / written_off`.
- **Payment** (`payments`): records a payment against an invoice (method, date, reference, amount). Balance-due computed as `invoice.total − Σ payments.amount`.
- **Tax** (`tax_categories`, `tax_rate_versions`): data-driven per-locale tax rates (GST + QST for CA-QC). Tax computation triggered via `POST /billing/invoices/:id/compute-taxes`. Rate versions are date-effective; the most recent active version ≤ `asOfDate` is applied.
- **Accounting / Journal** (`accounts`, `journal_entries`, `journal_entry_lines`): chart-of-accounts + double-entry journal. Invoice posting creates debit Receivables / credit Revenue lines. Payment posting creates debit Cash / credit Receivables lines. Each journal entry must balance (`Σ debits = Σ credits`). Status lifecycle `draft → posted → void`.

---

## Migration range

| Range | Content |
|---|---|
| 0001–0009 | Foundation (organizations, users, roles, audit events, RLS, jobs, passkeys, agentic entities, audit-events partition + canon alignment) |
| 0010–0014 | CRM (companies, contacts, pipeline, leads, soft-delete) |
| 0015–0020 | Project (projects, tasks, time entries, rates, assignments, invoice proposals) |
| 0021–0024 | Billing (invoices, payments, taxes, accounting/journal) |

---

## Conventions reused across modules

- **Audit events**: every mutating service function calls `emitAudit(db, context, { action, resourceType, resourceId, ... })`. Audit events are append-only (trigger blocks UPDATE/DELETE on `audit_events`). Partitioned monthly.
- **Timeline entries**: `emitTimeline(db, context, { resourceType, resourceId, entryType, payloadSummary })` mirrors select audit events for the activity-feed UI. Canonical `entryType` matches the audit `action`.
- **RLS**: all tenant tables carry `organization_id`. The `openerp_app` Postgres role uses row-level security (policy: `organization_id = current_setting('app.current_organization_id')::uuid`). The HTTP middleware sets the config variable before executing queries. The `users` table is the legacy per-tenant identity table; `user_identities` + `organization_members` is the canon identity layer (PG-02).
- **Soft-delete**: `deleted_at` column; service list functions filter `deleted_at is null`. Audit and timeline rows are never deleted.

---

## UX review outcomes (UXDR-003 … 006)

Full decisions in `rules/ux-decisions.md`. Summary:

| ID | Decision | Implementation |
|---|---|---|
| UXDR-003 | SideNav grouped into 4 sections (CRM, Projects, Billing, Admin) | `+layout.svelte` — 4 `SideNav` instances with `shell__nav-heading` headers; i18n `nav.section.*` keys |
| UXDR-004 | Admin sidebar hidden on pre-auth routes (`/login`, `/register-passkey`) | `isPreAuth` reactive guard; `.shell--no-sidebar` grid override |
| UXDR-005 | Horizontal `StatusStepper` on Opportunity + Invoice detail pages | `lib/components/StatusStepper.svelte`; `billing.invoices.step.*` i18n keys |
| UXDR-006 | Company detail shows related Opportunities + Contacts as read-only linked lists | `companies/[id]/+page.server.ts` extended Promise.all; two new sections on the detail page |

Evidence sources: `docs/reviews/2026-05-26-ux-review-implemented.md`, `docs/reviews/2026-05-26-ux-review-state-of-art.md`, `docs/reviews/2026-05-26-ux-review-synthesis.md`.
