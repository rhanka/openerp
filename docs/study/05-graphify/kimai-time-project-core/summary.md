# Graphify Summary: Kimai Time Project Core

## Progress

Fait: AST-only Graphify extraction completed for Kimai time, project, customer, activity, and working-time scope with TypeScript runtime proof.
À faire: Merge Kimai service-company concepts with Odoo/Aureus services and OpenMeter billing findings; overall study is about 88% complete.
Attendu: Use Kimai as the strongest service time-tracking functional reference, while keeping all source-level reuse blocked by AGPL.

## Provenance

- Source repo: https://github.com/kimai/kimai.
- Branch/ref: `main` at local shallow clone commit `ebb54e9c`.
- Source boundary: entity, timesheet, working time, project, customer, and activity PHP sources.
- Run workspace: ignored `research/graphify/runs-ast/kimai-time-project-core`.
- Runtime proof: `.graphify/.graphify_runtime.json` contains `runtime = typescript`.
- Extraction mode: Graphify headless AST extraction only.

## Graph Stats

- Code files extracted: 95.
- Nodes: 1,196.
- Edges: 1,464.
- Communities: 106.
- Top hubs from Graphify summary: `User`, `Customer`, `Timesheet`, `Invoice`, `InvoiceTemplate`.

## Findings

- Kimai's service-company model centers on user, customer, timesheet, invoice, invoice template, project, team, export template, activity, user preferences, and timesheet service.
- Time tracking is connected to customer, project, activity, user/team, rates, invoice, export, and reporting concepts.
- Working time and timesheet services make Kimai relevant for both professional services and internal service teams.
- AGPL means the graph can inform original requirements only.

## Product Implications

- The service-company core should include customer, project, activity, user/team, timesheet, working time calendar, rate, billable duration, export template, invoice draft link, and reporting dimensions.
- Time tracking should be first-class even when manufacturing is a vertical pack, because the product is not manufacturing-only.
- Do not copy Kimai entities, Symfony controllers, API paths, templates, translation strings, calculation code, or report layouts.
