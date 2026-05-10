# Anti-Copy Dossier

## Progress

Fait: Anti-copy dossier drafted for the future MIT project, covering recoding model, forbidden materials, allowed research use, source-family posture, AI-assisted controls, and pre-merge audit checklist.
À faire: Apply this dossier to module-level MVP specs and complete Canada/Quebec statutory research before native payroll or statutory accounting implementation; overall study is about 99% complete.
Attendu: Treat this dossier as a mandatory implementation gate, because the project uses GPL/AGPL/LGPL/EPL and permissive references as study inputs for an original MIT codebase.

## Legal Status

This is an engineering control document, not a legal opinion. It records the project posture for reducing copyright and license contamination risk while preserving the goal of an original MIT codebase. Counsel review remains required before large-scale commercial deployment, before copying any third-party implementation material, or before changing the target license.

## Recoding Model

Existing projects may be observed and analyzed. Future specs must be written in original French and English wording. Future implementation starts from OpenERP specs, not translated source files, copied snippets, copied schemas, copied UI flows, or line-by-line rewrites.

The approved flow is:

1. Study external products and repositories.
2. Summarize functional behavior in neutral notes.
3. Rewrite findings into OpenERP functional specs with original terminology.
4. Implement from OpenERP specs only.
5. Run pre-merge anti-copy audit before accepting implementation work.

This model is meant to separate ideas, workflows, and requirements from protected expression. It does not make copied expression safe.

## Do Not Copy

No source code, UI text, docs, assets, tests, demo data, internal names, or unusually specific schemas/APIs may be copied.

The prohibition includes:

- source files, snippets, comments, queries, migrations, generated clients, generated API contracts, and build scripts;
- UI labels, help text, examples, templates, reports, chart/dashboard definitions, email content, and document wording;
- database schemas, endpoint names, GraphQL operations, DTO names, field names, workflow names, state machines, and import/export formats that are distinctive to one source;
- tests, fixtures, demo records, screenshots, icons, sample documents, sample invoices, and sample payroll/accounting data;
- package/module taxonomy, plugin layout, folder structure, and internal service names when they are recognizable as copied structure;
- line-by-line translation from another programming language or framework into TypeScript, Svelte, or Rust.

## Allowed Research Use

Allowed research output is rewritten analysis:

- domain concepts;
- business workflows;
- user roles;
- state transitions at a functional level;
- integration needs;
- permission and audit expectations;
- localization requirements;
- architecture questions;
- implementation acceptance checks written in OpenERP wording.

Examples:

| Allowed | Not Allowed |
| --- | --- |
| "Invoices need draft, issued, paid, void/cancel states." | Copying a source project's exact invoice enum, state machine code, transition names, or tests. |
| "Timesheets must link employee, project, activity, approval, and billing status." | Copying Kimai entity fields, API routes, templates, or calculation code. |
| "Workflow runs need status, audit trail, retries, and permissions." | Copying Twenty or Node-RED workflow schema, flow JSON, node API, or UI wording. |
| "Advanced BI should support dashboards, filters, exports, and row-level access." | Copying Superset dashboard schemas, chart control definitions, SQL Lab behavior, or import/export YAML. |

## Source-Family Posture

| Source family | Current posture for MIT target |
| --- | --- |
| MIT | Usable for study and possible implementation inspiration with attribution tracking, but copying is still avoided unless explicitly recorded. |
| Apache-2.0 | Usable for study and possible integration/reuse with license, NOTICE, attribution, and patent-term review. Original implementation remains preferred. |
| BSD-like | Usable when exact license variant and attribution obligations are recorded. |
| LGPL/MPL/EPL | Cautious. Study is allowed, but technical reuse needs explicit review of file-level or weak-copyleft obligations. |
| GPL/AGPL | Functional reference only. AGPL/GPL sources influence functional specs only unless a separate legal decision approves deeper reuse. |
| Proprietary products | Public benchmark only. No technical reuse and no copied product expression. |

## AGPL/GPL Handling

Independent recoding from functional specs is not treated here as a modification of the studied AGPL/GPL project. The danger is copying or closely adapting protected expression. Therefore:

- AGPL/GPL repositories may be used to understand behavior, workflows, domain coverage, and integration needs;
- implementation agents must not port code, translate files, copy schemas, copy UI, or recreate distinctive internal structure;
- AGPL/GPL source should not be open side-by-side while writing implementation code;
- implementation prompts must cite OpenERP specs, not AGPL/GPL file paths, snippets, or function names;
- any proposed reuse beyond functional study requires a documented legal decision before work starts.

This is not an "AGPL-proof" guarantee. It is a control process. The project cannot honestly guarantee non-infringement merely because AI rewrote something. It can reduce risk through independent wording, implementation from specs, review, and audit evidence.

## AI-Assisted Recoding Controls

When AI is used for implementation:

- prompt from OpenERP specs and acceptance checks, not from third-party code;
- do not paste third-party source into implementation prompts;
- do not ask for direct translation from Python/PHP/Java/Groovy/JS/TS to TypeScript/Svelte/Rust;
- do not ask for "same schema/API/UI" output;
- ask for original names, original data contracts, and original UX flows;
- run similarity review for high-risk modules before merge;
- record any permissive-source implementation inspiration in a notice/attribution log before merge.

## Pre-Merge Audit Checklist

Every implementation PR touching domain behavior inspired by the corpus must answer:

- Which OpenERP spec section is the source of truth?
- Which external projects informed the spec?
- Are any external sources GPL or AGPL? If yes, confirm functional-spec-only use.
- Did implementation start from OpenERP specs rather than third-party files?
- Were third-party snippets, comments, UI strings, docs, assets, tests, fixtures, demo data, templates, or screenshots copied?
- Are names, schemas, APIs, workflow states, and file/module layout original enough that they are not recognizable as a copied source structure?
- If MIT/Apache/BSD material influenced implementation details, are license files, NOTICE requirements, attribution, and patent clauses recorded?
- If LGPL/MPL/EPL material influenced implementation details, was explicit review completed?
- Were generated clients, OpenAPI/GraphQL contracts, import/export formats, and migrations written originally?
- Were FR/EN strings written in OpenERP wording?
- Were acceptance tests written from OpenERP requirements rather than copied upstream tests?
- Are screenshots or visual designs original and free of copied assets?
- Does the PR description include an anti-copy note for any high-risk functional area?

## Anchor-Specific Notes

| Anchor | Handling |
| --- | --- |
| Odoo | LGPL/cautious. Functional ERP breadth only unless legal review approves technical reuse. Avoid model/view/report/localization copying. |
| Twenty | AGPL. Functional/platform reference only. Avoid metadata schema, generated SDK, workflow contracts, UI, and package structure. |
| Frappe HR and Kimai | GPL/AGPL. Functional HR/time/payroll reference only. Avoid doctypes/entities/API/templates/calculation code. |
| Kill Bill and OpenMeter | Apache-2.0. Strong permissive references for billing/metering, but keep original APIs, state machines, templates, and generated clients. |
| Aureus ERP | MIT. Useful permissive sanity check, but do not port Laravel/Filament structure or model taxonomy without attribution decision. |
| frePPLe | Cautious despite MIT text because of dual-license/commercial wording. Avoid solver logic and connector mappings. |
| OpenBoxes | EPL. Functional/cautious WMS reference. Avoid Groovy domains, services, GSP views, reports, and logistics labels. |
| Superset | Apache-2.0. Prefer integration/embedding for advanced BI. Avoid dashboard schemas, SQL Lab behavior, chart controls, and UI. |
| Node-RED | Apache-2.0. Prefer optional integration or narrow native automation. Avoid flow JSON, node APIs, editor canvas, palette, and built-in nodes. |

## Collaboration Addendum

Collaboration-specific anti-copy controls are documented in
`docs/study/08-anti-copy/collaboration-anti-copy-addendum.md`. The addendum
covers editor UI text, slash commands, block names, templates, onboarding copy,
demo spaces, screenshots, schema/API shapes, automation recipes, and the
boundary between object-linked OpenERP collaboration and copied workspace or
chat product expression.

## Reference Sources

- MIT license text: https://opensource.org/license/mit.
- Apache License 2.0 text and NOTICE obligations: https://www.apache.org/licenses/LICENSE-2.0.html.
- GNU GPL/AGPL overview and AGPL network-use note: https://www.gnu.org/licenses/.
- Eclipse Public License 1.0 text: https://www.eclipse.org/legal/epl/epl-v10.html.
- Local matrix: `docs/study/00-methodology/license-risk-matrix.md`.
