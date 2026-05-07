# Graphify Summary: Aureus Finance Models

## Progress

Fait: AST-only Graphify extraction completed for Aureus ERP finance model scope with TypeScript runtime proof.
À faire: Compare finance model maturity against Odoo and later statutory Canada/Quebec requirements; overall study is about 80% complete.
Attendu: Use Aureus as permissive MIT technical inspiration only after attribution and anti-copy hygiene, because permissive license does not remove expression-copy risk.

## Provenance

- Source repo: https://github.com/aureuserp/aureuserp.
- Branch/ref: `master` at local shallow clone commit `dd251ac`.
- Source boundary: code-only scope derived from `accounting`, `accounts`, `invoices`, and `payments` model/policy/enum/settings families.
- Run workspace: ignored `research/graphify/runs-ast/aureus-finance-models`.
- Runtime proof: `.graphify/.graphify_runtime.json` contains `runtime = typescript`.
- Extraction mode: Graphify headless AST extraction only.

## Graph Stats

- Code files extracted: 174.
- Nodes: 881.
- Edges: 870.
- Communities: 104.
- Top hubs from Graphify summary: `Move`, `Payment`, `MoveLine`, `PaymentRegister`, `Journal`.

## Findings

- Aureus finance centers on `Move`, `MoveLine`, `Payment`, `PaymentRegister`, and `Journal`, which is conceptually close to classic ERP accounting rather than a lightweight invoice-only tool.
- Graphify queries surfaced invoice detection, sale/purchase document distinction, journal selection, payment state, payment reconciliation, and move-line defaulting as key finance boundaries.
- The model graph is meaningfully broad for a MIT candidate, but it still needs maturity review: statutory localization, reporting, payroll postings, audit controls, and migration depth are not proven by this AST run.
- The finance model can be a useful permissive comparison point for Odoo, but direct copying of model names, relations, policies, or computed behaviors should be avoided or explicitly attributed and reviewed.

## Product Implications

- Our finance spec should preserve the abstract ledger model: move, move line, journal, payment, payment registration, reconciliation, invoice/bill distinction, partner, currency, tax, and payment terms.
- Canada/Quebec requirements still need independent statutory research. Aureus does not solve local compliance out of the box based on this graph.
- Aureus is useful for TypeScript/Rust backend planning only as a domain-shape reference; its Laravel/Filament implementation is not a target stack match.
