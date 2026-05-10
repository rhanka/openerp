# Collaboration MVP Addendum

## MVP-Safe Collaboration

Earlier collaboration candidates are the features that directly support the
ERP/CRM object spine and reuse foundation permissions, audit, files,
notifications, and i18n.

Include first:

- object comments and mentions;
- files attached to customers, opportunities, quotes, contracts, projects,
  tasks, time entries, invoices, support cases, assets, and work orders;
- activity timelines that combine user comments, system events, files, and
  decision records;
- structured decisions and approvals with requester, approver, reason, status,
  timestamps, attachments, and audit link;
- lightweight tasks on CRM, project, support, billing, and operations objects;
- customer and project pages for SOPs, handover notes, meeting notes, and
  shared context;
- notification inbox grouped by business object;
- permission-aware search across pages, comments, files, decisions, and tasks.

These features strengthen the MVP without creating a separate collaboration
product.

## Post-MVP Collaboration

Post-MVP collaboration can expand after the core ERP/CRM workflows prove value:

- richer page templates and reusable workspace structures;
- advanced task dependencies and workload views;
- customer-visible project rooms;
- collaborative forms for intake, quality checks, and approvals;
- richer exports for handover, audit packets, and support archives;
- object-linked external participant roles;
- more granular retention policies.

These features should remain attached to business records and tenant
permissions.

## Integration-First Collaboration

Some collaboration surfaces should start as integrations:

- generic chat and channel synchronization with Slack, Teams, Mattermost,
  Rocket.Chat, or Zulip;
- generic docs/wiki import from existing customer systems;
- advanced whiteboard/canvas tools;
- calendar and meeting transcription;
- external work-management sync with ClickUp, Asana, Monday.com, Jira, Linear,
  OpenProject, or Plane;
- advanced database workspace import from Airtable, Baserow, or NocoDB.

OpenERP should expose webhooks, APIs, exports, and stable object references so
integrations can attach cleanly.

## Deferred Collaboration

Defer:

- generic workspace databases not tied to ERP/CRM objects;
- generic company chat;
- full Slack or Teams parity;
- open-ended bot marketplace;
- advanced whiteboards;
- full portfolio management;
- broad no-code app builder;
- generic visual automation runtime;
- standalone knowledge operating system.

These areas create a second product and would distract from CRM, project,
billing, reporting, and service-company operations.

## ERP CRM Rationale

The MVP should treat collaboration as a multiplier for business workflows:

- sales teams need deal context, quote approvals, and handoff tasks;
- delivery teams need project notes, files, tasks, blockers, decisions, and
  approved time context;
- finance teams need invoice comments, dispute notes, payment follow-up, and
  audit packets;
- support teams need case discussion, customer-visible updates, files, and
  resolution decisions;
- manufacturing teams later need work order notes, quality decisions,
  maintenance attachments, and exception approvals;
- managers need an inbox and search surface that respects permissions.

Collaboration belongs in foundation and object-level modules. It should not
replace the CRM, project, billing, HR, manufacturing, or reporting domain
models.

## Acceptance Questions For Later Specs

- Which object types support comments, files, decisions, pages, and lightweight
  tasks in the first implementation wave?
- Which collaboration events write audit entries?
- Which collaboration records are customer-visible?
- How do inherited permissions and explicit narrow permissions interact?
- What is the minimum notification inbox that avoids generic chat?
- Which FR/EN templates are required for comments, decisions, approvals, and
  customer-visible updates?
- Which exports are required for self-hosted customers and audit packets?
- Which APIs and webhooks are needed for external collaboration tools?
