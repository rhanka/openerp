# Graphify Summary: Kill Bill Invoice And Payment

## Progress

Fait: AST-only Graphify extraction completed for Kill Bill invoice and payment scope with TypeScript runtime proof.
À faire: Reconcile invoice/payment lifecycle with accounting module requirements and Quebec/Canada tax research; overall study is about 84% complete.
Attendu: Keep Kill Bill as the permissive reference for invoice/payment orchestration, but do not treat it as a general ledger or local tax solution.

## Provenance

- Source repo: https://github.com/killbill/killbill.
- Branch/ref: `master` at local shallow clone commit `81a24d0c`.
- Source boundary: `invoice` and `payment` Java sources, excluding glue, DAO, notification, logging, template, provider, security, and bus paths for this pass.
- Run workspace: ignored `research/graphify/runs-ast/killbill-invoice-payment`.
- Runtime proof: `.graphify/.graphify_runtime.json` contains `runtime = typescript`.
- Extraction mode: Graphify headless AST extraction only.

## Graph Stats

- Code files extracted: 169.
- Nodes: 1,891.
- Edges: 2,757.
- Communities: 119.
- Top hubs from Graphify summary: `DefaultPaymentApi`, `DefaultInvoiceUserApi`, `InvoiceDispatcher`, `DefaultInvoice`, `PaymentStateContext`.

## Findings

- Invoice/payment is centered on payment API, invoice user API, invoice dispatcher, invoice model, and payment state context.
- Graphify surfaces invoice generation, invoice items, invoice dispatch, usage in arrears, payment control, payment methods, payment transactions, and plugin-oriented payment control as separate areas.
- Open-source subscription billing is materially deeper than basic ERP invoicing: payment retries, state context, invoice dispatch, usage in arrears, invoice adjustments, and payment control are first-class structures.
- This scope does not prove accounting ledger postings, tax filing, or payroll accounting.

## Product Implications

- Billing specs should include invoice dispatcher, invoice state, invoice items, recurring items, usage items, tax items, credit/adjustment items, payment transaction, payment method, payment retry, and plugin/control hook concepts.
- Accounting should remain a separate bounded context connected through postings/events rather than collapsed into billing code.
- Avoid copying invoice item class taxonomy, payment state names, plugin APIs, migrations, templates, and tests. Reuse should stay at the functional-boundary level unless counsel approves specific Apache-2.0 reuse with attribution.
