# MVP Spec: Billing And Accounting Operations

## Progress

Fait: Billing/accounting MVP spec drafted for invoice drafts, recurring billing schedules, project invoice proposals, payment status, journal postings, tax registration settings, and conservative accounting controls.
À faire: Draft reporting/automation spec; module-spec package is about 80% complete.
Attendu: Use this spec as the financial boundary for MVP implementation, while keeping statutory filing and native payroll outside scope until versioned rule packs exist.

## Objective

Create a conservative finance module that can support service-company billing without claiming complete statutory accounting or payroll coverage.

The MVP must:

- generate invoice drafts from project invoice proposals, recurring schedules, and manual lines;
- issue invoices with traceable source records;
- record payment status and manual payment registration;
- create balanced journal entries for invoice and payment events;
- track GST/HST/QST registration settings and tax lines through a configurable tax interface;
- support accounts receivable aging and export-ready ledger data;
- keep payroll, statutory filings, and full tax filing workflows out of MVP implementation.

## Roles

| Role | Responsibilities |
| --- | --- |
| Finance user | Reviews invoice drafts, issues invoices, records payments, reviews accounting entries, and runs AR exports. |
| Finance manager | Approves posting, period locks, write-offs, and sensitive corrections. |
| Project manager | Reviews project invoice proposal readiness and line traceability. |
| Sales lead | Reads customer contract/billing status where allowed. |
| Owner/admin | Configures chart, tax registrations, numbering, currencies, and approval thresholds. |
| Auditor/read-only user | Reads posted financial records and audit logs without mutation. |

## Data Entities

| Entity | Required Fields |
| --- | --- |
| `ChartOfAccounts` | id, organization_id, name, country, province_state, currency, status, created_at. |
| `Account` | id, organization_id, code, name, type, normal_balance, tax_control_flag, active, parent_account_id. |
| `TaxRegistration` | id, organization_id, authority, registration_number, tax_type, country, province_state, effective_from, effective_to, filing_frequency, status. |
| `TaxCategory` | id, organization_id, name, tax_type, country, province_state, taxable_treatment, active, effective_from, effective_to. |
| `TaxRateVersion` | id, organization_id, tax_category_id, rate_percent, effective_from, effective_to, source_note. |
| `Invoice` | id, organization_id, customer_company_id, language, currency, status, invoice_number, issue_date, due_date, subtotal_amount, tax_amount, total_amount, balance_due, source_type, source_id, created_at, posted_at. |
| `InvoiceLine` | id, organization_id, invoice_id, source_type, source_id, description_key, quantity, unit_price, subtotal_amount, tax_category_id, tax_amount, total_amount, revenue_account_id, trace_payload. |
| `RecurringBillingSchedule` | id, organization_id, customer_company_id, contract_id, service_item_id, status, frequency, next_run_date, start_date, end_date, currency, amount, tax_category_id. |
| `Payment` | id, organization_id, customer_company_id, invoice_id, payment_method, status, amount, currency, received_at, reference, created_at. |
| `JournalEntry` | id, organization_id, entry_number, status, entry_date, source_type, source_id, memo_key, posted_by, posted_at. |
| `JournalEntryLine` | id, organization_id, journal_entry_id, account_id, debit_amount, credit_amount, currency, customer_company_id, tax_registration_id, source_line_id. |
| `AccountingPeriod` | id, organization_id, fiscal_year, period_start, period_end, status, locked_at, locked_by. |
| `FinanceExport` | id, organization_id, export_type, period_start, period_end, status, created_by, created_at, file_id. |

## States

### Invoice Status

| State | Meaning |
| --- | --- |
| `draft` | Editable before issue. |
| `approved` | Reviewed and ready to issue. |
| `issued` | Sent or made available to customer; accounting entry can be posted. |
| `partially_paid` | Payment total is below invoice total. |
| `paid` | Balance due is zero. |
| `void` | Cancelled with controlled reason before or after issue according to policy. |
| `written_off` | Balance closed by approved write-off. |

### Journal Entry Status

| State | Meaning |
| --- | --- |
| `draft` | Generated or manual entry not posted. |
| `posted` | Final accounting record. |
| `reversed` | Reversed by linked correcting entry. |

### Accounting Period Status

| State | Meaning |
| --- | --- |
| `open` | Ordinary transactions allowed. |
| `closing` | Review in progress; sensitive changes restricted. |
| `closed` | Ordinary edits blocked; corrections require controlled entry. |

## Permission Model

Required permissions:

- `finance.invoice.read.own|team|organization`
- `finance.invoice.write.organization`
- `finance.invoice.approve.organization`
- `finance.invoice.issue.organization`
- `finance.payment.write.organization`
- `finance.journal.read.organization`
- `finance.journal.post.organization`
- `finance.period.manage.organization`
- `finance.tax.manage.organization`
- `finance.export.organization`

Rules:

- issuing invoices requires finance permission;
- posting journal entries requires finance posting permission;
- void, write-off, and period close require manager-level approval;
- closed-period corrections require reversal/correction workflow;
- tax settings require admin/finance configuration permission;
- exports are always audited.

## Workflows

### Invoice From Project Proposal

1. Project module emits approved invoice proposal handoff.
2. Finance user creates invoice draft from proposal.
3. System creates invoice lines with source links to proposal lines and time entries.
4. Tax interface calculates tax lines from customer location, registration settings, tax category, and effective rate version.
5. Finance user reviews and approves.
6. Finance user issues invoice.
7. System creates draft or posted journal entry according to tenant policy.

### Recurring Billing

1. User creates recurring schedule from contract/subscription.
2. Schedule stores frequency, amount, tax category, start/end, next run date, and status.
3. Worker generates invoice draft for due schedule.
4. Finance reviews and issues invoice.
5. Schedule advances next run date or ends.

### Payment Registration

1. Finance user records payment against invoice.
2. System validates amount, currency, payment date, and reference.
3. Payment updates invoice balance and payment status.
4. System creates payment journal entry or draft.
5. Overpayment/underpayment requires explicit handling state.

### Period Close Basics

1. Finance user reviews invoices, payments, journal entries, aging, and export readiness.
2. Finance manager marks period as closing.
3. System blocks ordinary backdated changes where configured.
4. Finance manager closes period.
5. Later corrections use reversing/correction entries.

## Business Rules

- Journal entries must balance before posting.
- Invoice numbers are generated by tenant numbering policy and cannot be reused.
- Issued invoice edits require revision, void, or credit/correction flow; no silent mutation.
- Invoice lines must retain source type/id when generated from project, recurring billing, or contract.
- Tax rates are effective-dated and stored as versions.
- Tax calculation must be replaceable by regional rule pack; MVP does not certify statutory tax filing.
- GST/HST/QST registration settings are organization configuration, not hard-coded assumptions.
- Collected tax posts to liability accounts, not revenue accounts.
- Payment registration cannot create negative invoice balances without overpayment policy.
- Closed periods block ordinary edits.
- Exports must include filters, period, actor, timestamp, and file checksum.

## API Expectations

Initial API surface:

- `GET /finance/accounts`
- `POST /finance/accounts`
- `GET /finance/tax-registrations`
- `POST /finance/tax-registrations`
- `PATCH /finance/tax-registrations/{id}`
- `GET /finance/tax-categories`
- `POST /finance/tax-categories`
- `GET /billing/recurring-schedules`
- `POST /billing/recurring-schedules`
- `PATCH /billing/recurring-schedules/{id}`
- `POST /invoices/from-project-proposal`
- `GET /invoices`
- `POST /invoices`
- `GET /invoices/{id}`
- `PATCH /invoices/{id}`
- `POST /invoices/{id}/approve`
- `POST /invoices/{id}/issue`
- `POST /invoices/{id}/void`
- `POST /payments`
- `GET /journal-entries`
- `POST /journal-entries`
- `POST /journal-entries/{id}/post`
- `POST /accounting-periods/{id}/close`
- `POST /finance/exports`

API rules:

- all finance writes return audit event ids;
- posting endpoints validate balanced accounting and permissions;
- tax calculation response includes rate version id and source configuration id;
- invoice generation from project proposal is idempotent by proposal id;
- export endpoints create asynchronous jobs with file reference.

## Events

Required domain events:

- `finance.tax_registration.created`
- `finance.tax_category.updated`
- `billing.schedule.created`
- `billing.schedule.invoice_draft_created`
- `invoice.draft_created`
- `invoice.approved`
- `invoice.issued`
- `invoice.voided`
- `payment.registered`
- `journal_entry.created`
- `journal_entry.posted`
- `journal_entry.reversed`
- `accounting_period.closed`
- `finance.export.created`

## Localization Requirements

- Invoice labels, payment terms, tax labels, line descriptions, and validation messages require FR/EN.
- Customer language determines invoice rendering language unless overridden.
- Currency and number formatting follow document language/locale rules but stored values remain numeric and currency-explicit.
- Tax registration names and document labels must support GST/HST/QST and future regional tax packs.

## Reporting Requirements

MVP finance reporting should include:

- open invoice list;
- AR aging;
- payments by period;
- revenue by customer/project;
- tax liability workpaper by tax registration and period;
- journal entry export;
- invoice proposal to invoice trace report;
- period close checklist.

## Acceptance Tests

- Invoice generated from project proposal preserves all source line references.
- Invoice cannot be issued without customer, due date, currency, and at least one line.
- Issued invoice creates balanced journal entry or configured draft entry.
- Journal entry posting fails if debits and credits do not balance.
- Payment registration reduces invoice balance.
- Full payment changes invoice status to paid.
- Overpayment requires explicit policy state.
- Tax line uses effective tax rate version for invoice issue date.
- Collected tax posts to liability account.
- Closed accounting period blocks ordinary invoice/payment edits.
- Void action requires reason and audit event.
- Finance export creates file object and audit event.
- FR and EN invoice labels exist before document generation.

## Non-Goals

- No native payroll calculation.
- No T4/RL slip filing.
- No statutory tax return filing certification.
- No bank feed reconciliation automation in MVP.
- No full subscription-billing engine equivalent to Kill Bill.
- No high-volume usage rating engine equivalent to OpenMeter.
- No copied Odoo accounting models, reports, XML views, localization templates, or workflows.
- No copied Kill Bill/OpenMeter APIs, state machines, generated clients, templates, or tests.

## Agentic Impacts

Agentic support adds supervised invoice preparation, dunning preparation, renewal watch, AR reconciliation suggestions, AP triage, anomaly detection, policy-blocked accounting actions and audit-visible finance approval; the consolidated impact map is in [`docs/study/10-mvp-specs/agentic-impacts.md`](agentic-impacts.md).
