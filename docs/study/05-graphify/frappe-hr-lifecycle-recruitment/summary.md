# Graphify Summary: Frappe HR Lifecycle And Recruitment

## Progress

Fait: AST-only Graphify extraction completed for Frappe HR lifecycle, recruitment, interview, onboarding, separation, and appraisal scope with TypeScript runtime proof.
À faire: Decide MVP depth for recruitment and employee lifecycle after payroll and time findings are merged; overall study is about 88% complete.
Attendu: Treat this run as functional specification input only, with no reuse of GPL doctypes, workflows, fixtures, or UI text.

## Provenance

- Source repo: https://github.com/frappe/hrms.
- Branch/ref: `develop` at local shallow clone commit `552c35fd`.
- Source boundary: job, interview, appointment letter, onboarding, separation, exit interview, appraisal, goal, KRA, promotion, and transfer doctypes.
- Run workspace: ignored `research/graphify/runs-ast/frappe-hr-lifecycle-recruitment`.
- Runtime proof: `.graphify/.graphify_runtime.json` contains `runtime = typescript`.
- Extraction mode: Graphify headless AST extraction only.

## Graph Stats

- Code files extracted: 124.
- Nodes: 473.
- Edges: 539.
- Communities: 92.
- Top hubs from Graphify summary: `TestAppraisal`, `Appraisal`, `Goal`, `TestInterview`, `ExitInterview`.

## Findings

- The graph covers recruitment, interviews, job openings, job applicants, onboarding, separation, exit interview, appraisal, goals, and employee movement.
- Employee onboarding and separation appear as paired lifecycle flows rather than isolated documents.
- Interview and feedback concepts are structurally visible, which helps write original hiring workflow specs.
- Appraisal and goals are present, but they should be deferred if MVP needs to stay focused on employee records, time, leave, and payroll.

## Product Implications

- MVP HR should include employee lifecycle basics: job applicant, job opening, interview, offer/appointment, onboarding task, separation task, exit interview, transfer, and promotion.
- Appraisal, goals, skills, and training can be phase-two unless target customers explicitly require performance management early.
- Do not copy Frappe doctype names, JSON metadata, test data, workflow details, email/UI text, or report structures.
