# Zulip Object Async Graphify Summary

## Provenance

- repository URL: https://github.com/zulip/zulip
- HEAD commit: `6e06e50`
- date checked: 2026-05-09
- license evidence: root `LICENSE` declares Apache-2.0.
- local source: `research/sources/zulip`
- Graphify workspace: `research/graphify/zulip-object-async`
- runtime proof: `research/graphify/zulip-object-async/.graphify/.graphify_runtime.json` contains `"runtime": "typescript"`.
- Graphify outputs: `graph.json`, `graph.html`, and `GRAPH_REPORT.md` in the ignored workspace.

## Scope

modules inspected:

- `zerver/models`
- selected `zerver/actions` files for messages, streams, users, user topics,
  reactions, uploads, exports, and notifications.
- `zerver/openapi`

Graph result:

- 53 included files.
- 905 nodes.
- 2057 graph links.
- 46 communities.

This run is AST-oriented. Non-code files were limited to license and readme
context; the study summary below is rewritten in OpenERP language.

## Communities Observed

The main hubs were `UserProfile`, `Realm`, `Recipient`, `SystemGroups`,
`Client`, `StreamTopicsPolicyEnum`, `Stream`, and `NotificationTriggers`.

The graph points to an architecture built around users, organizations,
recipients, streams, topics, direct message groups, messages, reactions,
notifications, exports, OpenAPI documentation, and permission checks.

## Functional Findings In OpenERP Language

- OpenERP should not build generic company chat first. It should build
  object-linked async communication on customers, opportunities, projects,
  invoices, support cases, assets, and work orders.
- Discussion participants should come from the business object context, not
  from a separate channel administration model.
- Mentions, read state, reactions, files, export, and notification triggers are
  useful collaboration primitives when attached to auditable business records.
- System-generated messages should record status changes, approvals,
  assignments, imports, reminders, and integration callbacks on the object
  timeline.
- An OpenAPI-style public contract is useful, but OpenERP must define original
  endpoint names and payloads from its own domain model.

## License And Reuse Boundary

Zulip is Apache-2.0 and therefore the strongest communication candidate for
deeper technical study in this extension. Any reuse still requires notice,
dependency, asset, and non-code expression review.

## Anti-Copy Limitations

- anti-copy: do not copy Zulip source, stream/topic product model, endpoint
  names, OpenAPI examples, message UI, docs, tests, import/export formats,
  notification defaults, or onboarding copy.
- anti-copy: avoid channel-first navigation. OpenERP should use business
  objects as the durable collaboration anchor.
- anti-copy: future implementation must start from OpenERP functional specs,
  not from this source tree or Graphify graph.
