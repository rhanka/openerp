# Graphify Summary: Odoo Services, CRM, HR And Timesheets

## Progress

Fait: AST-only Graphify extraction completed for the Odoo services/CRM/HR/timesheet code scope with TypeScript runtime proof.
À faire: Add semantic module manifests and compare with Dolibarr/Kimai/Frappe HR later; overall study is about 76% complete.
Attendu: Use this graph to draft service-company workflow requirements, while avoiding Odoo model, method, and portal implementation copying.

## Provenance

- Source repo: https://github.com/odoo/odoo.
- Branch/ref: `19.0` at local shallow clone commit `af50cb24`.
- Source boundary: code-only scope derived from `crm`, `hr`, `hr_attendance`, `hr_holidays`, `hr_timesheet`, `project`, and `sale_timesheet`.
- Run workspace: ignored `research/graphify/runs-ast/odoo-services-crm-hr`.
- Runtime proof: `.graphify/.graphify_runtime.json` contains `runtime = typescript`.
- Extraction mode: Graphify headless AST extraction only.

## Graph Stats

- Code files extracted: 189.
- Nodes: 2,098.
- Edges: 2,594.
- Communities: 261.
- Top hubs from Graphify summary: `ProjectTask`, `HrEmployee`, `ProjectProject`, `CrmLead`, `HrLeave`.

## Findings

- The graph centers service delivery around project tasks, employees, projects, CRM leads, and leave. That aligns with a service-company core product rather than a manufacturing-only product.
- `ProjectTask`, `ProjectProject`, and `AccountAnalyticLine` communities show that task execution, time capture, portal/customer visibility, and analytic accounting are tightly connected in Odoo.
- `HrEmployee`, `HrLeave`, and `HrLeaveAllocation` appear as major HR hubs, but this graph does not prove payroll completeness. It supports HR profile, leave, allocation/accrual, and timesheet requirements.
- `CrmLead` is a meaningful hub but not the dominant one in this cross-scope graph; CRM should connect to projects and tasks without letting project delivery erase the separate sales pipeline domain.

## Product Implications

- MVP service-company flow should include lead/opportunity, project, task, employee/resource, timesheet, customer portal visibility, and analytic/project accounting hooks.
- HR in MVP can cover employee records, leave/time-off, attendance or timesheet integration, and approvals before local payroll engine work.
- Do not copy Odoo's analytic-line, portal, leave accrual, CRM, or project method names and schemas. Extract only independent functional requirements.
