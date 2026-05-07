# Graphify Summary: Twenty CRM Core

## Progress

Fait: AST-only Graphify extraction completed for the Twenty CRM core code scope with TypeScript runtime proof.
À faire: Add a more business-object-oriented CRM cut if needed, run workflow and object view scopes, and reconcile findings with the anti-copy dossier; overall study is about 74% complete.
Attendu: Use this run mainly to flag Twenty's integration-heavy CRM architecture, then refine the scope for company/person/opportunity graph detail.

## Provenance

- Source repo: https://github.com/twentyhq/twenty.
- Branch/ref: `main` at local shallow clone commit `83c40bb8`.
- Source boundary: code-only scope derived from server modules `calendar`, `company`, `opportunity`, `person`, `task` and frontend modules `companies`, `people`, `dashboards`.
- Run workspace: ignored `research/graphify/runs-ast/twenty-crm-core`.
- Runtime proof: `.graphify/.graphify_runtime.json` contains `runtime = typescript`.
- Extraction mode: Graphify headless AST extraction only; non-code semantic files were excluded from this first pass.

## Graph Stats

- Code files extracted: 119.
- Nodes: 356.
- Edges: 258.
- Communities: 119.
- Top hubs from Graphify summary: `CalendarChannelSyncStatusService`, `CalDavFetchEventsService`, `CalendarEventImportErrorHandlerService`, `CalendarAccountAuthenticationService`, `CalendarBlocklistListener`.

## Findings

- The initial CRM core graph is dominated by calendar import/sync services rather than company, person, opportunity, or task objects.
- This is still useful: Twenty treats connected accounts, calendar sync status, CalDAV/OAuth refresh, import jobs, blocklists, and error handling as significant CRM-adjacent infrastructure.
- Graphify query output highlighted cron commands and event-list fetch commands. This implies that activity capture in a modern CRM is not just manual task entry; background sync and external account state matter.
- The object-level CRM model did not surface strongly in this cut, likely because company/person/opportunity modules are thin entry points compared with shared metadata and generated object layers.

## Product Implications

- Our CRM spec should separate business objects from activity ingestion infrastructure: contacts/accounts/deals/tasks are one layer, connected email/calendar/activity sync is another.
- For an MIT rewrite, do not copy Twenty's connected-account service names, sync commands, queue structure, API shapes, or dashboard implementation.
- The next CRM pass should inspect object metadata and generated schema layers before concluding that Twenty's CRM domain model is thin.

## Next Scope

- Combine this with `twenty-object-metadata` before making product conclusions.
- Run a narrower Twenty workflow graph for automation triggers and execution.
- If needed, add a classic CRM comparison from SuiteCRM or EspoCRM for cases, campaigns, and quotes.
