# Graphify Summary: Odoo Finance And Canada Localization

## Progress

Fait: AST-only Graphify extraction completed for the Odoo finance/localization code scope with TypeScript runtime proof.
À faire: Add semantic extraction for README/license/manifests if needed, inspect Odoo operations/services separately, and reconcile finance findings with Canada/Quebec statutory research; overall study is about 74% complete.
Attendu: Treat this as a structural finance graph, not an implementation source, because Odoo remains cautious LGPL and anti-copy boundaries are strict.

## Provenance

- Source repo: https://github.com/odoo/odoo.
- Branch/ref: `19.0` at local shallow clone commit `af50cb24`.
- Source boundary: code-only scope derived from `account`, `l10n_ca`, `api_doc`, and `rpc`.
- Run workspace: ignored `research/graphify/runs-ast/odoo-finance-localization`.
- Runtime proof: `.graphify/.graphify_runtime.json` contains `runtime = typescript`.
- Extraction mode: Graphify headless AST extraction only; non-code semantic files were excluded from this first pass.

## Graph Stats

- Code files extracted: 95.
- Nodes: 2,521.
- Edges: 3,303.
- Communities: 370.
- Top hubs from Graphify summary: `AccountMove`, `AccountMoveLine`, `AccountJournal`, `AccountPayment`, `AccountAccount`.

## Findings

- `AccountMove` dominates the finance graph. This confirms that invoices, journal entries, tax preparation, invoice references, sending flow, and move-line behavior are structurally central in Odoo accounting.
- `AccountMoveLine` is the second major hub, so line-level accounting, tax, reconciliation, analytic dimensions, and partner/product links should be modeled as first-class concepts in our independent finance specification.
- Journal and payment hubs indicate that dashboard/reporting behavior is tightly coupled to operational accounting state in Odoo. Our target should separate ledger correctness from UX dashboards to avoid copying Odoo's implementation shape.
- `AccountChartTemplate` appears as a key community. Canada/Quebec accounting research should focus on chart template, tax template, fiscal position, remittance, and report localization requirements, not just translated labels.
- Graphify queries surfaced invoice reference generation and tax preparation methods around `AccountMove`. These are high-risk anti-copy areas: only the abstract requirement should be retained.

## Product Implications

- Finance MVP needs an explicit transaction model: journal entry, journal line, invoice, payment, tax line, account, partner, currency, and reporting period.
- Canada localization should be a separate compliance module layered on a generic ledger, not hard-coded into the global accounting core.
- Odoo can inform functional coverage and dependency awareness, but not schemas, method names, XML views, reports, test data, or workflow text.

## Next Scope

- Run a separate Odoo operations graph for `crm`, `project`, `sale_timesheet`, `hr_timesheet`, `stock`, `mrp`, `maintenance`, and `repair`, split into smaller cuts if the graph exceeds useful size.
- Pair this graph with official CRA/Revenu Quebec sources before writing any Canada/Quebec accounting spec.
