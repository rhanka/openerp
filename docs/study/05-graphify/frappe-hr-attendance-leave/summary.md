# Graphify Summary: Frappe HR Attendance And Leave

## Progress

Fait: AST-only Graphify extraction completed for Frappe HR attendance, shift, check-in, and leave scope with TypeScript runtime proof.
À faire: Convert findings into original HR functional specs and compare against Quebec/Canada statutory leave requirements; overall study is about 88% complete.
Attendu: Use Frappe HR as a functional reference only because GPL blocks source-level reuse for the future MIT target.

## Provenance

- Source repo: https://github.com/frappe/hrms.
- Branch/ref: `develop` at local shallow clone commit `552c35fd`.
- Source boundary: attendance, employee check-in, attendance tools, upload attendance, shift, leave, compensatory leave, earned leave, and holiday assignment doctypes.
- Run workspace: ignored `research/graphify/runs-ast/frappe-hr-attendance-leave`.
- Runtime proof: `.graphify/.graphify_runtime.json` contains `runtime = typescript`.
- Extraction mode: Graphify headless AST extraction only.

## Graph Stats

- Code files extracted: 137.
- Nodes: 1,135.
- Edges: 1,803.
- Communities: 123.
- Top hubs from Graphify summary: `LeaveApplication`, `TestLeaveAllocation`, `make_policy_assignment()`, `TestLeaveApplication`, `get_employee()`.

## Findings

- Leave and attendance are not just employee calendar fields. The graph exposes leave application, leave allocation, leave ledger, earned leave schedule, attendance request, employee check-in, shift assignment, and shift type workflows.
- Leave validation and balance handling are central, with explicit errors around insufficient balance, allocations, blocked days, and holidays.
- Shift assignment and employee check-in create an attendance operations layer that matters for small manufacturers and shift-based service companies.
- Test-heavy hubs indicate strong behavioral coverage in the source, but those tests are protected expression and must not be copied.

## Product Implications

- Original HR specs should include employee check-in, attendance request, shift type, shift assignment, leave type, leave policy, leave allocation, leave application, leave ledger, earned leave, holidays, and balance validation.
- Quebec/Canada statutory requirements need independent analysis for vacation, sick leave, public holidays, CNESST rules, and employment standards.
- Do not copy Frappe doctypes, Python validation flows, JSON field definitions, fixtures, tests, or UI text.
