# Graphify Summary: Aureus HR And Service Models

## Progress

Fait: AST-only Graphify extraction completed for Aureus ERP HR/services model scope with TypeScript runtime proof.
À faire: Compare with Frappe HR, Kimai, and Odoo service-company graph findings; overall study is about 80% complete.
Attendu: Treat this run as evidence that a permissive ERP can cover HR and service workflows partially, while payroll and Quebec/Canada compliance remain open.

## Provenance

- Source repo: https://github.com/aureuserp/aureuserp.
- Branch/ref: `master` at local shallow clone commit `dd251ac`.
- Source boundary: code-only scope derived from `employees`, `time-off`, `timesheets`, `projects`, `support`, and `recruitments` model/policy/enum/settings families.
- Run workspace: ignored `research/graphify/runs-ast/aureus-hr-services-models`.
- Runtime proof: `.graphify/.graphify_runtime.json` contains `runtime = typescript`.
- Extraction mode: Graphify headless AST extraction only.

## Graph Stats

- Code files extracted: 179.
- Nodes: 1,090.
- Edges: 963.
- Communities: 152.
- Top hubs from Graphify summary: `Employee`, `Applicant`, `Project`, `Task`, `Company`.

## Findings

- HR/services are centered on employees, applicants, projects, tasks, and support companies.
- Graphify queries surfaced candidate-to-partner and candidate-to-employee transitions, which indicates recruitment-to-employee lifecycle modeling.
- Timesheet models connect project and task and update task time totals, supporting the service-company need for work tracking.
- This graph shows useful HR and service adjacency, but it does not prove payroll, benefits, statutory leave, local HR compliance, or project accounting maturity.

## Product Implications

- MVP service scope should include employee, applicant/candidate, project, task, timesheet, support company/customer, and time-off concepts.
- Payroll should remain a separate statutory workstream; Aureus HR/service structure is not enough to model Quebec/Canada payroll.
- Aureus confirms that permissive ERP references can support service-company requirements, but Frappe HR/Kimai remain important for HR/time depth.
