# Graphify Summary: Frappe HR Payroll Core

## Progress

Fait: AST-only Graphify extraction completed for Frappe HR payroll core scope with TypeScript runtime proof.
À faire: Compare payroll abstractions with Quebec/Canada statutory payroll requirements before deciding MVP inclusion; overall study is about 88% complete.
Attendu: Use this graph for original payroll specification vocabulary only; source-level reuse remains blocked by GPL.

## Provenance

- Source repo: https://github.com/frappe/hrms.
- Branch/ref: `develop` at local shallow clone commit `552c35fd`.
- Source boundary: salary, payroll, income tax slab, taxable salary slab, employee tax, employee benefit, additional salary, employee incentive, other income, and employee cost-center doctypes.
- Run workspace: ignored `research/graphify/runs-ast/frappe-hr-payroll-core`.
- Runtime proof: `.graphify/.graphify_runtime.json` contains `runtime = typescript`.
- Extraction mode: Graphify headless AST extraction only.

## Graph Stats

- Code files extracted: 119.
- Nodes: 713.
- Edges: 1,244.
- Communities: 95.
- Top hubs from Graphify summary: `SalarySlip`, `PayrollEntry`, `TestSalarySlip`, `EmployeeBenefitDetail`, `SalaryDetail`.

## Findings

- Payroll centers on salary slip and payroll entry, with salary structure, salary detail, salary component, salary slip leave, salary slip timesheet, benefits, additional salary, tax slab, and accounting entry adjacency.
- Payroll entry connects payroll processing to accounting-style accrual and payable concepts.
- Timesheet-to-salary-slip and leave-to-salary-slip concepts are relevant to both service companies and shift-based operations.
- This is not Canada/Quebec payroll compliance evidence. Generic tax slab and salary-slip structures do not cover CRA, Revenu Quebec, CNESST, T4, RL-1, ROE, CPP/QPP, EI, QPIP, or Quebec labor rules.

## Product Implications

- Payroll should be treated as a regionalized module with independent statutory packs, not as a generic calculation table.
- Original specs should include payroll period, payroll entry, salary structure, salary component, salary slip, salary detail, employee benefit, additional salary, tax rule, leave linkage, timesheet linkage, and accounting posting events.
- For MVP, payroll may need to be de-prioritized or integration-first unless Quebec/Canada compliance research proves an achievable narrow scope.
