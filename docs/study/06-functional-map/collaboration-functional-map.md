# Collaboration Functional Map

## Purpose

Collaboration is a transverse layer for ERP/CRM work. It should make customer,
project, billing, support, HR, manufacturing, and management workflows easier
to coordinate without turning OpenERP into a generic Notion, ClickUp, Airtable,
or Slack clone.

The map is based on the collaboration corpus, proprietary public benchmarks,
fiches, and Graphify summaries for BookStack, Baserow, and Zulip.

## embedded collaboration

Embedded collaboration covers comments, mentions, object activity, lightweight
tasks, files, decisions, approvals, and notifications attached to business
objects.

Primary object links:

| Object | Collaboration Use |
| --- | --- |
| customer | Account notes, relationship decisions, internal handoffs, shared files, and customer-visible threads. |
| contact | Interaction notes, consent-sensitive files, reminders, and relationship context. |
| opportunity | Qualification notes, next steps, deal-room files, pricing approvals, and handoff tasks. |
| quote | Review comments, margin approvals, legal notes, version decisions, and customer-facing discussion. |
| contract | Renewal decisions, obligations, service scope notes, signed files, and audit-sensitive changes. |
| project | Delivery discussion, risks, decisions, files, status notes, customer updates, and approval history. |
| task | Assignee discussion, checklist items, blockers, file references, time context, and status changes. |
| time entry | Review comments, correction requests, approval notes, and billing justification. |
| invoice | Dispute notes, approval comments, payment follow-up, attachments, and collection history. |
| support case | Customer conversation, internal escalation, resolution notes, files, and closure approval. |
| asset | Maintenance notes, inspection files, ownership changes, warranty evidence, and incident discussion. |
| work order | Shop-floor notes, quality decisions, attachments, rework discussion, and completion approval. |
| audit event | Immutable event context, reason notes, export traceability, and sensitive-change evidence. |

## Knowledge Workspace

The knowledge workspace supports pages, spaces, templates, SOPs, meeting notes,
implementation notes, customer/project knowledge, and versioned decisions.

Required capabilities:

- business-object pages attached to customers, projects, contracts, support
  cases, assets, and work orders;
- internal wiki spaces for procedures, onboarding, policies, finance
  operations, HR guides, and manufacturing instructions;
- page permissions inherited from the business object or explicitly narrowed;
- exports for self-hosted backup, client handover, and review;
- search across pages, comments, files, tags, and business references;
- FR/EN page templates and bilingual labels.

Evidence anchors:

- BookStack Graphify: content entities, permission derivation, search, exports,
  references, and API formatting.
- Proprietary public benchmarks: Notion and Airtable only as public expectation
  references.
- Source-available public benchmarks: Outline and Anytype only as benchmark
  references.

## work management

Work management covers tasks, boards, lists, calendars, status changes,
dependencies, checklists, forms, and operational accountability.

Required capabilities:

- task lists and board views on projects, opportunities, support cases,
  onboarding plans, implementation plans, work orders, and approval queues;
- lightweight dependencies for delivery and implementation work;
- forms for customer intake, service requests, approvals, and quality checks;
- workload visibility scoped to teams, projects, and customer commitments;
- status history and automation hooks for assignments, due dates, and blockers;
- exportable views for managers and self-hosted customers.

Evidence anchors:

- Baserow Graphify: tables, dynamic fields, views, rows, linked records,
  forms, tokens, webhooks, and API surfaces.
- Plane, Huly, OpenProject, Vikunja, Taiga, and Focalboard as functional
  references only or cautious references.
- ClickUp, Monday.com, and Asana as public benchmarks only.

## async communication

Async communication should be object-linked first. A user should start from a
customer, opportunity, invoice, project, support case, asset, or work order and
see the relevant conversation there.

Required capabilities:

- durable object threads;
- mentions and participants;
- files and links;
- read state;
- system messages for assignments, approvals, imports, exports, status changes,
  invoice events, and integration callbacks;
- notification preferences;
- export and retention controls;
- API and webhook entry points.

Evidence anchors:

- Zulip Graphify: users, organizations, recipients, streams, topics, direct
  messages, reactions, notifications, exports, OpenAPI, and permission checks.
- Rocket.Chat and Mattermost as cautious or functional references.
- Slack and Microsoft Teams as public benchmarks only.

Out of early scope:

- generic workspace chat;
- broad channel directory;
- voice/video meetings;
- public community moderation;
- generic bot marketplace;
- full Slack or Teams parity.

## Files And Attachments

Files attach to business objects and collaboration objects.

Rules:

- files inherit access from the parent object by default;
- sensitive files can narrow visibility;
- file events write audit entries when exported, deleted, or shared externally;
- files can appear in pages, comments, tasks, approvals, invoices, support
  cases, assets, and work orders;
- virus scanning, retention, and storage policies belong to foundation.

## Notifications And Inbox

Notifications should be useful without becoming generic chat noise.

Notification triggers:

- mention;
- assignment;
- approval requested;
- approval completed;
- due date approaching;
- status changed;
- comment reply;
- file added;
- invoice dispute or payment event;
- support escalation;
- work order exception;
- import/export completed or failed.

Inbox requirements:

- group notifications by object;
- preserve read/unread state;
- support FR/EN message templates;
- respect permissions before showing content previews;
- keep audit-sensitive events immutable.

## Decisions And Approvals

Decisions are structured collaboration events. They should be easier to audit
than free-form comments.

Decision examples:

- quote approved;
- contract clause accepted;
- project scope change accepted;
- time entry correction accepted;
- invoice dispute resolved;
- support case closure accepted;
- purchase or manufacturing exception accepted;
- quality rework accepted.

Approval requirements:

- requester;
- approver;
- object link;
- reason;
- status;
- timestamp;
- attachments;
- audit event link;
- optional customer-visible summary.

## Customer-Visible Collaboration

Customer-visible collaboration should be explicit and permission-narrow.

Candidate surfaces:

- customer portal discussion on quotes, projects, support cases, invoices, and
  handover documents;
- shared project status page;
- shared file exchange;
- approval request page;
- customer intake form;
- dispute/resolution thread.

Internal-only collaboration remains the default.

## permissions and audit

Collaboration must consume the foundation permission model instead of inventing
a parallel one.

Rules:

- deny by default;
- inherit parent-object permissions by default;
- allow explicit narrowing for sensitive pages, files, comments, and decisions;
- write audit events for sharing, export, permission changes, deletion,
  approval, and customer-visible publication;
- separate internal users, external customer users, service providers, and
  auditors;
- enforce tenant isolation in search, exports, API, and notifications.

## Search And Exports

Search should cross collaboration and business records while respecting
permissions.

Search surfaces:

- pages;
- comments;
- decisions;
- files metadata;
- tasks;
- support cases;
- project records;
- invoice and payment notes;
- asset and work order notes.

Export surfaces:

- customer workspace export;
- project handover export;
- audit packet export;
- billing dispute packet;
- support case archive;
- self-hosted backup and migration export.

## Self-Hosted Concerns

Self-hosted deployments need collaboration features to be operationally safe:

- storage backend configuration;
- backup and restore for files, pages, comments, and object links;
- search index rebuild;
- worker queues for notifications and exports;
- retention settings;
- release notes for collaboration migrations;
- version-state preflight checks before schema changes.

## Bilingual FR/EN Behavior

bilingual behavior covers UI, templates, notifications, exports, and search.

Requirements:

- FR/EN UI labels for comments, tasks, pages, inbox, approvals, and exports;
- FR/EN notification templates;
- FR/EN default page templates;
- user language preference for notifications;
- organization default language;
- customer-visible language override;
- search tolerant of translated labels and bilingual object names.

## Implementation Posture

Earlier candidates:

- object comments and mentions;
- files on business objects;
- activity timeline;
- structured decisions;
- lightweight tasks;
- customer/project pages;
- notification inbox;
- permission-aware search.

Later candidates:

- generic workspace databases;
- generic chat;
- advanced whiteboards;
- full portfolio management;
- open-ended automation builder;
- voice/video collaboration.

## Non-Copy Rule

This map is an OpenERP-written functional synthesis. It must not be used to
copy code, UI text, docs, templates, screenshots, demo spaces, editor behavior,
schema/API shapes, import/export formats, tests, or distinctive product
expression from studied products.
