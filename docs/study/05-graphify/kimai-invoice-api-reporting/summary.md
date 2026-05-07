# Graphify Summary: Kimai Invoice API And Reporting

## Progress

Fait: AST-only Graphify extraction completed for Kimai API, invoice, reporting, and export scope with TypeScript runtime proof.
À faire: Decide how much project billing/reporting belongs in MVP versus later service-company pack; overall study is about 88% complete.
Attendu: Use this run to write original service billing and reporting specs, without copying AGPL API, templates, or invoice calculations.

## Provenance

- Source repo: https://github.com/kimai/kimai.
- Branch/ref: `main` at local shallow clone commit `ebb54e9c`.
- Source boundary: API, invoice, reporting, and export PHP sources.
- Run workspace: ignored `research/graphify/runs-ast/kimai-invoice-api-reporting`.
- Runtime proof: `.graphify/.graphify_runtime.json` contains `runtime = typescript`.
- Extraction mode: Graphify headless AST extraction only.

## Graph Stats

- Code files extracted: 167.
- Nodes: 992.
- Edges: 940.
- Communities: 162.
- Top hubs from Graphify summary: `InvoiceItem`, `InvoiceModel`, `InvoiceService`, `ProjectViewModel`, `ProjectDateRangeQuery`.

## Findings

- Invoice/reporting centers on invoice item, invoice model, invoice service, project view model, project date-range query, project detail model, service export, team API, timesheet API, and PDF rendering.
- This is strong evidence for service-company reporting requirements: project date ranges, project details, billable duration, billable rate, exports, and invoice generation.
- API controllers expose operational surfaces for timesheets, teams, projects, customers, invoices, and exports, but those endpoint shapes are anti-copy-sensitive.
- Kimai includes French and `fr_CA` locale support, but the inspected code does not prove Quebec statutory tax, labor, or payroll compliance.

## Product Implications

- MVP service reporting should include project date range, project detail, billable duration, billable amount, export, invoice draft, invoice item, invoice template, and timesheet API concepts.
- Invoicing should connect to the billing/accounting modules rather than duplicate general ledger or tax compliance.
- Avoid copying Kimai API paths, Symfony service names, invoice formatter/calculator implementation, PDF/export renderer structures, templates, and translation strings.
