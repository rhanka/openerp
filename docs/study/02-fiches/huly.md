# Huly

## Evidence

- Date checked: 2026-05-09.
- Public sources checked: GitHub organization `hcengineering`, repository `hcengineering/platform`, repository `hcengineering/huly-selfhost`, and public README/license metadata.
- Product position: all-in-one collaboration platform and framework for business applications, including project management, chat, documents/knowledge, CRM, HRM, and ATS.
- Repository evidence observed: TypeScript/Svelte platform, self-host repository, Docker Compose guidance, Kubernetes sample configuration in self-host materials, API client documentation references, production version tags, tests, and architecture documentation references.
- Current activity signal: organization page showed `hcengineering/platform` updated 2026-04-19, `huly-selfhost` updated 2026-03-31, and latest platform release `v0.7.413` from 2026-04-14.

## License And Reuse

- Declared license: EPL-2.0 in public GitHub metadata for `hcengineering/platform` and `huly-selfhost`.
- Reuse classification: `legal review required`.
- Rationale: EPL-2.0 is not the preferred MIT-compatible source pool for this study. Use as a functional and architectural reference unless legal review approves specific reuse boundaries.
- Source reuse guardrail: do not copy platform services, object model, UI components, bundled apps, API client shapes, tests, or deployment manifests without explicit review.

## Collaboration Coverage

- Strong for integrated collaboration: project work, chat, documents, team spaces, CRM-adjacent records, HR/ATS, notifications, and application framework concepts.
- Relevant behaviors: issue/task management, workspace identity, linked documents, conversations, typed business objects, and cross-app context.
- Distinctive product scope: closer to a collaboration operating system than a single board/database tool.

## ERP CRM Fit

- ERP fit: promising reference for cross-module collaboration around records, especially when tasks, documents, chat, and people data need to live together.
- CRM fit: public README identifies CRM systems and bundled CRM/HRM/ATS apps as part of the platform scope.
- Weak or unverified areas: statutory accounting, inventory costing, procurement, manufacturing, Canadian/Quebec compliance, payroll accounting, and tax.
- Best OpenERP adjacency: collaboration timeline, record-linked discussions, project work tied to customers, and team knowledge around business objects.

## Architecture Notes

- Stack evidence: TypeScript, Svelte, Rust/Go components, Rush monorepo workflow, Docker development stack, MongoDB, Elasticsearch, MinIO, Redis and service-oriented platform references in README.
- Architecture signal: rich object model and app platform are highly relevant, but the platform is broad and operationally heavy.
- API signal: public README points to typed API client documentation and examples.
- Operational complexity: self-host docs warn about meaningful resource requirements; this is not a small embedded module.

## Self-Hosted And Kubernetes

- Self-host support: strong through `huly-selfhost` Docker Compose instructions.
- Kubernetes support: sample Kubernetes configuration is referenced under the self-host repository.
- Operational notes: production should use release tags; migration notes must be reviewed before updates; minimum resources are materially higher than simple task tools.

## I18n And Localization

- UI localization was not deeply audited in this pass.
- Business localization: no Canada/Quebec statutory accounting, tax, HR, or payroll compliance was identified.
- OpenERP use: treat Huly as a collaboration architecture reference, not localization evidence.

## Anti-Copy Notes

- Do not copy its app taxonomy, workspace UX, object schema, API client types, chat/document coupling, icons, docs, service manifests, or migration scripts.
- Use only high-level learnings: collaboration should be record-centric, contextual, and cross-module.
- EPL-2.0 requires explicit legal review before any source-level reuse.

## OpenERP Takeaways

- Huly is the richest collaboration reference in the batch, but not the safest license source.
- OpenERP should borrow the product lesson, not the implementation: tasks, discussions, documents, and CRM context should converge around business records.
- Keep the first implementation narrower: customer/project timelines, linked tasks, comments, mentions, and document references before a full multi-app platform.
