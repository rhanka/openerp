# Collaboration Anti-Copy Addendum

## Collaboration-Specific Expression Risks

Collaboration products expose a large amount of recognizable expression in
their editors, templates, onboarding flows, sample spaces, visual hierarchy,
schemas, and APIs. This makes anti-copy discipline especially important even
when a product is used only as a public benchmark or functional reference.

High-risk material includes:

- editor UI text;
- slash commands;
- block names;
- empty states;
- onboarding copy;
- templates;
- demo spaces;
- screenshots;
- icons and illustrations;
- document schemas;
- schema/API shapes;
- import/export formats;
- automation recipes;
- notification default wording;
- workspace object names;
- route names and endpoint names;
- test fixtures and example workspaces.

## Permitted Functional Abstractions

Allowed collaboration research output is neutral, rewritten behavior:

- users can comment on a business object;
- users can mention a teammate and trigger a notification;
- a file can inherit parent-object permissions;
- a decision can record requester, approver, reason, status, timestamp, and
  audit link;
- a project page can summarize meeting notes and customer handover context;
- a form can collect customer intake or quality-check data;
- a webhook can notify an external system when an object-bound event occurs;
- an inbox can group unread events by customer, project, invoice, or support
  case.

These abstractions must be expressed with OpenERP terminology and implemented
from OpenERP specs.

## Blocked Reuse Examples

Blocked reuse includes:

- copying Notion, ClickUp, Airtable, Monday.com, Asana, Slack, Teams, Outline,
  or Anytype product copy, screenshots, templates, page structures, demos,
  workspace names, or proprietary flows;
- copying AppFlowy, Docmost, Logseq, Plane, Vikunja, NocoDB, or other AGPL or
  source-available implementation code, tests, schemas, routes, editor labels,
  or sync internals;
- copying BookStack hierarchy wording, routes, permission copy, API examples,
  import templates, or UI labels without explicit attribution and review;
- copying Baserow field names, view UI, validation text, API shape, generated
  model structures, webhooks, or form behavior;
- copying Zulip stream/topic product model, endpoint names, OpenAPI examples,
  notification defaults, import/export formats, message UI, or onboarding copy;
- adapting slash-command structures, block model names, workflow names, default
  templates, or automation recipes from one source closely enough to be
  recognizable.

## Review Checklist

Before any collaboration implementation merge, verify:

- implementation prompts cited OpenERP specs, not third-party source files;
- no third-party source code, comments, tests, fixtures, screenshots, icons,
  templates, demo spaces, or copy were pasted into the implementation;
- UI labels and FR/EN strings are original OpenERP wording;
- document/page/block/task/comment/decision names are original;
- schemas, API routes, webhook payloads, import/export formats, and event names
  are original OpenERP contracts;
- object-linked collaboration starts from customers, opportunities, projects,
  tasks, invoices, support cases, assets, work orders, and audit events rather
  than from a copied workspace/channel model;
- permissive sources, if technically consulted, have recorded license and
  attribution obligations;
- AGPL, GPL, BSL, source-available, and proprietary sources remain functional
  references or public benchmarks only;
- screenshots and PPTX visuals are original and do not embed product UI from
  studied tools.
