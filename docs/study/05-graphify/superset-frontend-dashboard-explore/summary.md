# Graphify Summary: Superset Frontend Dashboard And Explore

## Progress

Fait: AST Graphify extraction completed for Superset dashboard/explore frontend scope with TypeScript runtime proof.
À faire: Translate the UX findings into original ERP reporting workflows and integration requirements; overall study is about 96% complete.
Attendu: Use Superset frontend as a benchmark for expected BI capabilities, not as a UI pattern source to copy.

## Provenance

- Source repo: https://github.com/apache/superset.
- Branch/ref: `master` at local shallow clone commit `b5186d1c`.
- License boundary: Apache-2.0, favorable for study and possible integration, but frontend source, UI wording, layout behavior, chart controls, and interaction flows must not be copied into the future MIT product.
- Source boundary: `superset-frontend/src/explore`, `superset-frontend/src/dashboard`, and selected page families for chart, dashboard, dataset, and role lists.
- Run workspace: ignored `research/graphify/runs-ast/superset-frontend-dashboard-explore`.
- Runtime proof: `.graphify/.graphify_runtime.json` contains `runtime = typescript`.
- Extraction mode: Graphify headless AST extraction only.

## Graph Stats

- Code files extracted: 146.
- Nodes: 585.
- Edges: 711.
- Communities: 67.
- Top hubs from Graphify summary: `Dashboard`, `StandardizedFormData`, `ChartStateConverterRegistry`, `exportChart()`, `getExploreUrl()`.
- Sensitive files skipped by detection: 0.

## Findings

- Dashboard state is a central UX layer: chart placement, slice entities, labels/colors, hydration, native filters, cross-filters, and dashboard metadata are structurally visible.
- Explore is form-driven: standardized form data, control state, datasource compatibility, chart-state conversion, explore URLs, and chart data payload assembly are separate concerns.
- Permission checks appear near dashboard edit/save behavior, which reinforces that BI authoring and viewing should not share the same access model.
- Filtering is multi-layered: native filters, filter scope trees, dashboard context, temporal filters, and cross-filter relationships each have their own graph communities.
- Export and URL generation are explicit capabilities, which matters for service-company reporting and management dashboards.

## Product Implications

- The ERP reporting UX should be simpler than Superset: operational reports, saved views, dashboard widgets, exports, scheduled delivery, and role-aware filters.
- BI authoring can be deferred behind an integration boundary, while the core product owns report definitions tied to ERP entities.
- If an embedded BI path is chosen, the ERP must define object-level permissions and tenancy rules before exposing dashboard edit, export, or filter-sharing features.
- Frontend implementation in Svelte should use original component structure, terminology, state model, and interaction design.

## Anti-Copy Notes

- Do not copy Superset React components, dashboard grid behavior, control panel definitions, chart-state converters, native filter structures, URL formats, CSS, UI wording, icons, or test fixtures.
- Feature inspiration is acceptable at a capability level: dashboards, filters, saved charts, exports, scheduled reports, and role-aware authoring.
