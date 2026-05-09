# MVP Spec: Foundation, Security, And I18n

## Progress

Fait: First implementation-ready MVP spec drafted for tenant foundation, user/role/permission model, audit logging, settings, files, notifications, and FR/EN localization baseline.
À faire: Draft CRM, project/time-to-invoice, billing/accounting, and reporting/automation specs; module-spec package is about 20% complete.
Attendu: Use this spec as the base contract for every later MVP module, because permissions, audit, locale, tenant settings, and update visibility are cross-cutting.

## Objective

Create the platform foundation needed before CRM, project delivery, billing, accounting, HR, reporting, and automation can be implemented safely.

The foundation module must provide:

- organization and tenant identity;
- users, roles, permissions, and teams;
- bilingual French/English UI baseline;
- tenant settings for locale, currency, time zone, tax region, and deployment/update state;
- immutable audit trail for sensitive changes;
- files and document references;
- comments and internal activity feed;
- notification primitives;
- API and event conventions shared by later modules.

## Roles

| Role | Responsibilities |
| --- | --- |
| System operator | Operates SaaS/self-hosted infrastructure, migrations, backups, and version visibility. No ordinary access to tenant business data without controlled break-glass flow. |
| Organization owner | Owns tenant settings, users, roles, billing/admin settings, integrations, and data export. |
| Admin | Manages users, roles, teams, settings, and module configuration within delegated scope. |
| Manager | Manages team membership, assignments, approvals, and operational records in later modules. |
| Standard user | Uses assigned business modules according to permissions. |
| External user | Optional customer/partner portal user with tightly scoped access. |
| Auditor/read-only user | Can inspect records, reports, exports, and audit logs without write access. |

## Data Entities

| Entity | Required Fields |
| --- | --- |
| `Organization` | id, legal/display name, slug, status, default locale, default currency, default timezone, country, province/state, created_at, updated_at. |
| `TenantSettings` | organization_id, supported_locales, primary_locale, tax_region, fiscal_year_start, document_numbering policies, retention settings, self_hosted_update_state. |
| `User` | id, organization_id, email, display_name, preferred_locale, status, mfa_state, last_login_at, created_at, updated_at. |
| `Team` | id, organization_id, name, parent_team_id, manager_user_id, status. |
| `Role` | id, organization_id, name, description, system_role flag, status. |
| `PermissionGrant` | role_id or user_id, resource, action, scope, conditions, created_by, created_at. |
| `AuditEvent` | id, organization_id, actor_user_id, actor_type, action, resource_type, resource_id, before_summary, after_summary, ip_hash, user_agent_hash, created_at. |
| `FileObject` | id, organization_id, storage_key, filename, content_type, size_bytes, checksum, visibility_scope, created_by, created_at. |
| `Comment` | id, organization_id, resource_type, resource_id, body, visibility, created_by, created_at, updated_at. |
| `Notification` | id, organization_id, recipient_user_id, channel, subject_key, body_key, payload, status, created_at, read_at. |
| `TranslationKey` | key, namespace, en_text, fr_text, description, status, updated_at. |
| `DomainEvent` | id, organization_id, event_type, resource_type, resource_id, payload_summary, emitted_at, consumed_at. |

## Permission Model

Permissions use the shape:

```text
resource.action.scope
```

Examples:

- `crm.company.read.own`
- `crm.company.write.team`
- `finance.invoice.approve.organization`
- `admin.user.manage.organization`
- `audit.event.read.organization`

Required actions:

| Action | Meaning |
| --- | --- |
| `read` | View records and non-sensitive fields. |
| `write` | Create or edit ordinary fields. |
| `delete` | Soft-delete where allowed. |
| `approve` | Move a record through approval gates. |
| `post` | Create financial/accounting finality where relevant. |
| `export` | Export data outside the application. |
| `manage` | Configure settings, roles, integrations, or module behavior. |

Required scopes:

| Scope | Meaning |
| --- | --- |
| `own` | Records owned by or assigned to the user. |
| `team` | Records owned by the user's team and child teams where configured. |
| `organization` | All tenant records in the resource family. |
| `external` | Customer/partner portal scope. |
| `system` | Infrastructure/system operation scope outside ordinary tenant business access. |

## Workflows

### Tenant Setup

1. Create organization with legal/display name and slug.
2. Select primary locale, supported locales, currency, timezone, country, and province/state.
3. Create first owner user.
4. Create baseline roles: owner, admin, manager, standard user, auditor, external user.
5. Configure fiscal year start, document numbering placeholder, tax region placeholder, and data retention defaults.
6. Emit audit events for every setup step.

### User Invitation

1. Admin creates invitation with email, locale, teams, and roles.
2. System sends localized invitation.
3. User accepts, sets authentication, and confirms preferred locale.
4. User becomes active.
5. Audit trail records invitation, acceptance, role assignment, and first login.

### Role Change

1. Admin opens user role assignment.
2. System shows current grants and inherited team scope.
3. Admin modifies roles or direct grants.
4. System validates the admin can grant those permissions.
5. Change is saved and audited.
6. User sessions receive updated permission state.

### Language Change

1. User changes preferred locale.
2. UI updates display language without changing tenant defaults.
3. Documents and emails use explicit document/customer/user locale rules.
4. Audit records preference change only if required by tenant policy.

### Self-Hosted Update Visibility

1. System records current version, latest supported version, and support window state.
2. Admin sees whether instance is under 12 months behind, 12-24 months behind, or beyond 24 months behind.
3. Admin can run preflight checks for database, storage, workers, and integrations.
4. Update action requires backup confirmation and audit event.

## Business Rules

- Every organization has at least one active owner.
- System operator access to tenant business data requires explicit break-glass audit event.
- Permissions deny by default.
- Role changes, exports, financial postings, integration secret changes, and update actions are always audited.
- Audit events are append-only. Corrections are new events, not edits.
- Delete is soft-delete unless a retention policy explicitly allows hard deletion.
- FR and EN text must exist before a UI feature is considered release-ready.
- Translation keys are stable identifiers; business logic must not branch on displayed text.
- Timezone is stored per organization and user; persisted event timestamps use UTC plus display conversion.
- Currency defaults belong to organization settings, but financial records store explicit currency.
- Notification templates must use translation keys and structured payloads, not string concatenation.
- File storage must record checksum, content type, size, actor, and visibility scope.

## API Expectations

Initial API surface:

- `GET /me`
- `GET /organizations/current`
- `PATCH /organizations/current/settings`
- `GET /users`
- `POST /users/invitations`
- `PATCH /users/{id}`
- `GET /roles`
- `POST /roles`
- `PATCH /roles/{id}`
- `GET /permissions/effective`
- `GET /audit-events`
- `POST /files`
- `GET /files/{id}`
- `POST /comments`
- `GET /notifications`
- `PATCH /notifications/{id}`
- `GET /i18n/catalog?locale=fr|en`
- `GET /system/update-state`

API rules:

- every write endpoint returns an audit event id where applicable;
- list endpoints support pagination, filtering, and stable sorting;
- exported data must include export actor, timestamp, filters, and organization id;
- errors must return stable machine codes and localized display messages;
- API responses must not expose hidden permission grants or secrets.

## Events

Required domain events:

- `organization.created`
- `organization.settings_changed`
- `user.invited`
- `user.activated`
- `user.deactivated`
- `user.roles_changed`
- `role.created`
- `role.updated`
- `file.uploaded`
- `comment.created`
- `notification.sent`
- `audit.exported`
- `system.update_preflight_requested`

Each event must include organization id, resource id, actor summary, timestamp, and minimal payload summary.

## Localization Requirements

- FR/EN required for all user-visible UI strings.
- FR/EN required for email subjects, notification body templates, document labels, validation errors, and empty states.
- Default tenant locale and user preferred locale are separate.
- Documents need explicit language selection rules: customer preferred language, document override, or organization default.
- Address, phone, date, time, number, and currency formatting must be locale-aware.
- Translation export/import should be possible for review, but imported translations require validation before release.

## Audit And Compliance

Always audit:

- login/security-sensitive account changes;
- user activation/deactivation;
- role and permission changes;
- organization settings changes;
- exports;
- file upload/delete;
- integration secret changes;
- automation activation/deactivation;
- financial approval/posting hooks in later modules;
- self-hosted update preflight and upgrade actions.

Audit log filters:

- actor;
- action;
- resource type;
- resource id;
- date range;
- module;
- export id.

Audit log access is permissioned separately from ordinary record access.

## Acceptance Tests

- Creating an organization also creates baseline roles and an owner.
- A tenant cannot have zero active owners.
- A user without `admin.user.manage.organization` cannot invite or deactivate users.
- A manager with team scope cannot view records outside team scope.
- Role changes appear in audit log with actor, target user, before/after summary, and timestamp.
- `GET /me` returns effective permissions but no secret values.
- UI catalog fails release validation if a new key lacks FR or EN text.
- User preferred locale changes UI language without changing organization default.
- Notifications render in recipient language.
- Export action creates audit event and export metadata.
- Self-hosted update state shows the three support windows: under 12 months, 12-24 months, and over 24 months.
- File upload records checksum and visibility scope.
- Audit events cannot be edited through public APIs.

## Non-Goals

- No marketplace/plugin runtime in MVP foundation.
- No full identity provider product; support external SSO later through integration.
- No native payroll, statutory filing, or accounting close logic in this foundation module.
- No copied permission schema or metadata model from Odoo, Twenty, Superset, or Node-RED.
