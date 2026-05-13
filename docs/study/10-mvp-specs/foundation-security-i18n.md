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
5. Configure fiscal year start, document numbering (pending - to be confirmed by maintainer), tax region (pending - to be confirmed by maintainer), and data retention defaults.
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

## Agentic Impacts

Agentic support adds tenant-aware identity modes, policy hooks, tool-call audit fields, supervision actions, budget limits, revocation paths and bilingual FR/EN notification requirements to the foundation layer; the consolidated impact map is in [`docs/study/10-mvp-specs/agentic-impacts.md`](agentic-impacts.md).

## Enrichment 2026-05-12

### Functional Depth

#### User Stories

- As an Organization Owner, I provision a new tenant with primary locale FR-CA, currency CAD, timezone America/Toronto and Quebec tax region so that downstream modules inherit consistent defaults from day one.
- As an Admin, I invite a new colleague by email with a preselected role and team so that the invitee lands on a working account scoped to the minimum permissions she needs.
- As a Standard User member of two organizations, I switch active tenant from a persistent selector so that I keep the same browser session without re-authenticating and without leaking data across tenants.
- As an Auditor, I filter the audit log by actor, action, resource type, date range and module so that I can produce a defensible evidence pack for an internal control review.
- As a Standard User, I reset my forgotten password through a single-use token and confirm my preferred locale (FR-CA) so that my UI, notifications and emails immediately match my working language.

#### Golden Path: Onboarding And First Multi-Tenant Login

1. System Operator provisions the tenant shell (organization slug, region, residency flag) and triggers `organization.created`.
2. Organization Owner receives an FR-CA bootstrap email with a single-use activation link bound to an `Idempotency-Key`.
3. Owner activates the account, sets password + TOTP, confirms primary locale FR-CA, supported locales [FR-CA, EN-CA], currency CAD, timezone America/Toronto, Quebec tax region and fiscal year start.
4. System materializes baseline roles (owner, admin, manager, standard user, auditor, external user), grants `manage.organization` to the Owner role, and emits `organization.settings_changed` + audit events for each setup step.
5. Owner invites a first Admin (email + locale + role + team). System sends a localized invitation; invitee accepts, sets password, optional TOTP, and selects EN-CA as preferred locale.
6. Admin invites a Standard User who is already member of a sister tenant (same primary email, distinct tenant rows). System detects the secondary membership at activation and exposes the organization switcher.
7. Standard User logs in: pre-tenant landing prompts tenant selection if more than one membership is active, otherwise auto-routes to the default tenant. Tenant context is bound to the session cookie; permission set is reloaded; `user.activated` and login audit events are recorded.
8. Standard User switches tenant via the persistent selector. Server invalidates the previous tenant scope on the session, issues a new tenant claim, reloads i18n catalog if locale differs, and writes an `org.switch` audit event with previous and new tenant ids.

#### Edge Cases

- FR-CA vs EN-CA mismatch: invitee preferred locale (FR-CA) differs from organization default (EN-CA); UI honors user preference, notifications use recipient locale, documents follow document language rules, no silent fallback to French-France.
- Concurrent sessions: same user authenticated on desktop and mobile in two tenants; revoking a role must invalidate cached permission claims on both sessions within one polling interval.
- Tenant switching with stale browser tab: tab still showing tenant A after switch to tenant B; any write attempt must be rejected with a stable error code (`tenant.context.stale`) and force a soft reload, not silently write to tenant B.
- Password reset flooding: same email triggers reset more than N times in window; system throttles per email + per IP hash, never reveals account existence, and emits an audit event tagged `security.suspect`.
- Audit log saturation: append-only store nears retention threshold; system continues writing, alerts the System Operator, and offers paginated export, never drops events nor blocks the writing workflow.
- Multi-tenant data leak attempt: a forged `organization_id` in a write payload must be rejected by middleware before reaching the handler; any mismatch between session tenant claim and payload tenant must raise an audit event tagged `security.tenant_mismatch`.
- Accented login (`prenom@exemple.com` vs `prénom@exemple.com`): emails normalized NFC before comparison to prevent duplicate accounts.
- Owner self-demotion: last active owner cannot remove their own `manage.organization` grant; UI blocks, API returns `org.owner.last_active`.

#### Acceptance Criteria

- A fresh tenant has exactly one active owner, six baseline roles, primary locale and currency set, before any user invitation succeeds.
- Login flow supports FR-CA and EN-CA from the catalog; no English string leaks into FR-CA screens at release validation.
- Multi-tenant login presents a tenant chooser if and only if the user has more than one active membership.
- Password reset token is single-use, expires within configured TTL, and emits `user.password_reset` audit event with actor = the user, ip_hash and ua_hash populated.
- Permission evaluation denies by default; `GET /permissions/effective` returns the resolved set for the current tenant only.
- Organization switcher updates tenant claim atomically; cross-tenant writes during transition are rejected with `tenant.context.stale`.
- Audit log query supports pagination, filtering by all required fields, and refuses edits via any public endpoint.
- I18n catalog release gate fails when any key is missing FR-CA or EN-CA text or when any key exceeds documented length budget.
- TOTP enrollment is optional in MVP but mandatory for the owner role; recovery codes are issued once and never re-shown.
- Soft-deletes preserve audit trail; restore action is itself audited.

### Cross-ERP Benchmark

| Capability | Aureus (MIT) | Odoo (LGPL) | ERPNext (GPL) | Twenty (AGPL) | Posture appliquée |
| --- | --- | --- | --- | --- | --- |
| Local auth (password) | Present | Present | Present | Present | Table stakes; original implementation. |
| 2FA / TOTP | Partial | Present (`auth_totp`) | Partial | Partial | Table stakes MVP; functional inspiration only, no UI text reuse from Odoo. |
| Passkey / WebAuthn | Absent | Present (`auth_passkey`) | Absent | Partial | Skip MVP; revisit post-MVP. |
| Password policy | Partial | Present (`auth_password_policy`) | Partial | Partial | Table stakes; rules expressed as policy object, not Odoo XML. |
| Flat RBAC (role x permission) | Present | Partial (groups/rules) | Present | Present | Functional reuse from Aureus pattern with MIT notice; do not copy table names. |
| Field-level ACL | Absent | Present (ir.model.fields ACL) | Partial | Partial | Anti-copy hotspot (Odoo); skip MVP, design abstract record-policy hook. |
| Multi-tenant isolation | Absent (single-tenant by default) | Absent (multi-company is in-tenant) | Partial (site per tenant) | Present (workspaces) | Anti-copy hotspot; original design (row-level `organization_id` + middleware). |
| Audit log | Partial | Present (mail.tracking, ir.logging) | Present | Partial | Functional reuse pattern; original schema, no `mail.message` lookalike. |
| Audit fields (created_at/by/updated_at/by) | Present | Present | Present | Present | Table stakes; common pattern, no copy concern. |
| Organization / workspace switching | Absent | Partial (company switch) | Partial | Present | Functional reuse from Twenty pattern (rewritten), no UI text reuse. |
| i18n catalog FR/EN | Partial | Present (.po per module) | Present | Present | Table stakes; choose ICU JSON, not Odoo `.po` per module. |
| FR-CA locale specifics | Weak | Partial (`l10n_ca`, `l10n_fr`) | Partial | Weak | Functional reuse: study Odoo `l10n_ca` for fiscal hooks, no source copy. |
| SSO / OAuth | Absent | Present (`auth_oauth`, `auth_ldap`) | Premium-only | Present | Skip MVP; reserve adapter shape only. |
| Per-tenant branding | Absent | Premium-only (Enterprise) | Partial | Partial | Skip MVP; record decision. |
| Session timeout / auth_timeout | Partial | Present (`auth_timeout`) | Partial | Partial | Table stakes; original implementation. |

### UI Screen Inventory

Each screen lists internal name, purpose, primary data, actions, components, inspiration with anti-copy note, and i18n payload. Catalog keys use namespace `foundation.<area>.<key>`. Length budgets are characters before wrap, mobile portrait.

1. `auth.login` - Sign-in screen.
   - Purpose: authenticate a user against email + password (+ TOTP if enrolled).
   - Data: email, password, optional TOTP code, persistent locale toggle, locale-aware date in footer.
   - Actions: submit, forgot password, switch language (FR-CA / EN-CA), help link.
   - Components: form, validated input, error banner, locale switcher, brand mark slot.
   - Inspiration: Aureus Filament login layout (MIT, notice); never copy Odoo login HTML/CSS.
   - i18n: `foundation.auth.login.title` (max 32), `foundation.auth.login.email_label` (max 24), `foundation.auth.login.password_label` (max 24), `foundation.auth.login.submit_cta` (max 18), `foundation.auth.login.forgot_link` (max 32), `foundation.auth.login.error_invalid` (max 80).

2. `auth.password_reset_request` - Request a reset link.
   - Purpose: trigger a one-time reset token; never disclose account existence.
   - Data: email only.
   - Actions: submit, back to login.
   - Components: form, neutral confirmation banner.
   - Inspiration: generic OWASP forgot-password pattern; no donor UI copy.
   - i18n: `foundation.auth.reset.request_title` (max 36), `.help` (max 120), `.confirmation_neutral` (max 140).

3. `auth.password_reset_confirm` - Set a new password from token.
   - Purpose: validate token, enforce policy, set new password.
   - Data: token (URL), new password, confirmation.
   - Actions: submit, show password strength, regenerate recovery codes if TOTP enabled.
   - Components: password input with strength meter, policy hint list.
   - Inspiration: original.
   - i18n: `foundation.auth.reset.confirm_title` (max 36), `.policy_hint` (max 80), `.success_cta_login` (max 24).

4. `account.profile` - User self-profile.
   - Purpose: edit display name, preferred locale, timezone, TOTP enrolment, sessions.
   - Data: profile fields, active sessions list (device hint + last seen + tenant), TOTP state.
   - Actions: save profile, enable/disable TOTP, regenerate recovery codes, revoke session, change preferred locale.
   - Components: tabbed layout, session table, modal for TOTP enrollment.
   - Inspiration: Aureus profile (MIT, notice); no Odoo `res.users` field naming.
   - i18n: `foundation.account.profile.title` (max 24), section labels (max 28), `.session_revoke_cta` (max 18).

5. `org.switcher` - Persistent organization selector.
   - Purpose: switch active tenant for the current session.
   - Data: list of memberships (organization display name, role badge, last_used_at).
   - Actions: select tenant, mark default, request access (if cross-tenant invitation enabled).
   - Components: popover menu anchored in header, search input for >10 memberships.
   - Inspiration: Twenty workspace switcher pattern (AGPL, functional only, no source); no UI text copied.
   - i18n: `foundation.org.switcher.label` (max 18), `.no_other_org` (max 60), `.set_default_cta` (max 20).

6. `admin.members` - Member management.
   - Purpose: list, invite, deactivate, reset MFA, assign roles and teams.
   - Data: paginated user list with name, email, status, roles, teams, last_login, locale.
   - Actions: invite, deactivate/reactivate, edit roles, force MFA reset, export CSV.
   - Components: filter bar (status, role, team, locale), table, drawer for edit, invite modal.
   - Inspiration: Aureus member admin (MIT, notice); avoid Odoo `res.users` and Twenty workspace member field names.
   - i18n: `foundation.admin.members.title` (max 28), filter labels (max 18), status enum keys (max 16).

7. `admin.roles` - Role and permission management.
   - Purpose: create roles, attach permission grants by resource.action.scope, visualize coverage.
   - Data: role list with usage count, permission matrix (resource x action) scoped to current tenant.
   - Actions: create role, edit grants, clone role, archive role.
   - Components: split view (role list, permission matrix), conflict warning banner when admin tries to grant a permission they do not hold.
   - Inspiration: original abstraction over `resource.action.scope`; no Odoo `ir.model.access` mimic, no Twenty permission set copy.
   - i18n: `foundation.admin.roles.title` (max 28), matrix headers (max 18), `.conflict_self_grant` (max 120).

8. `admin.audit_log` - Audit log viewer.
   - Purpose: review immutable events for compliance.
   - Data: paginated events with timestamp (tenant tz), actor, action, resource, before/after summary, ip_hash, ua_hash.
   - Actions: filter, export (audited), open detail drawer.
   - Components: filter bar, virtualized table, detail drawer with JSON diff renderer.
   - Inspiration: generic audit viewer (no donor reuse).
   - i18n: `foundation.audit.viewer.title` (max 28), action enum keys, `.export_cta` (max 18), `.diff_no_change` (max 60).

9. `admin.tenant_settings` - Tenant defaults.
   - Purpose: edit primary locale, supported locales, currency, timezone, country, province, tax region, fiscal year start, retention.
   - Data: settings record.
   - Actions: save (audited), preview locale change.
   - Components: grouped form, locale chips, currency picker, timezone autocomplete.
   - Inspiration: Aureus org settings (MIT, notice); no Odoo `res.company` field name reuse.
   - i18n: `foundation.tenant.settings.title` (max 32), group labels (max 28), `.save_confirm` (max 80).

10. `account.language_switcher` - In-header locale toggle.
    - Purpose: quick switch between FR-CA and EN-CA for the current user.
    - Data: enabled locales for the tenant, current preferred locale.
    - Actions: switch (persisted to profile).
    - Components: dropdown anchored in header, accessible labels.
    - Inspiration: original.
    - i18n: `foundation.locale.switcher.label` (max 18), `.fr_ca_native` (fixed "Francais (CA)"), `.en_ca_native` (fixed "English (CA)").

### Tech Layer Options

1. RBAC shape.
   - Decision: how to express permissions in MVP.
   - Context: foundation must serve later modules with consistent semantics; donor patterns range from Odoo groups (LGPL) to Twenty workspace permissions (AGPL).
   - Options:
     - Flat role x permission (role -> list of `resource.action.scope`): simple, deterministic, fast to evaluate, low cognitive load; harder to express inheritance.
     - Hierarchical roles (role inherits from parent): elegant for admin trees, but evaluation cost and audit traceability suffer; risks Odoo group-tree mimicry (anti-copy hotspot).
     - ABAC (attribute-based with conditions): future-proof, expressive, but high complexity for MVP; conditions become hard to audit and test.
   - Reco: Flat role x permission with optional `conditions` JSON on `PermissionGrant` reserved for future scopes; do not implement role inheritance in MVP.
   - Dépendance: every later module spec depends on this shape; audit log schema must store the resolved grant id.

2. Multi-tenant isolation.
   - Decision: how to isolate tenant data at storage level.
   - Context: target deploy ranges from single-tenant self-hosted to multi-tenant SaaS; cost and operational simplicity matter.
   - Options:
     - Schema-per-tenant: strong isolation, easy per-tenant backup/restore; migration fan-out cost and connection pool pressure grow with tenant count.
     - Row-level with `organization_id` + middleware enforcement + DB row policies: low operational cost, scales well, requires disciplined middleware and integration tests; main MVP candidate.
     - DB-per-tenant: maximum isolation and noisy-neighbor protection; highest ops cost, hard to query across tenants for the system operator.
   - Reco: Row-level with mandatory `organization_id` on every business row, middleware-bound tenant claim, and Postgres row-level security policies as defense in depth.
   - Dépendance: all entities, all migrations, all query builders, and the audit and export pipelines.

3. Auth transport.
   - Decision: how to carry session and identity to the API.
   - Context: server-rendered admin shell plus future SPA/mobile; must support tenant switching mid-session.
   - Options:
     - HTTP-only secure cookie session with server-side store: simple, robust CSRF protection via SameSite, easy revocation; couples API to cookie host.
     - Short-lived JWT in header + refresh: stateless, friendly to mobile and B2B SDK; revocation requires denylist or short TTL; harder for tenant switch without refresh.
     - Hybrid (cookie for web shell + refresh token for first-party SDK): balanced but adds two code paths.
   - Reco: HTTP-only cookie for MVP, with tenant claim stored server-side; reserve hybrid for post-MVP when SDK ships.
   - Dépendance: organization switcher, mobile roadmap, agentic runtime which needs scoped tokens.

4. I18n catalog format.
   - Decision: how to author and ship FR-CA / EN-CA text.
   - Context: FR-CA primary, EN-CA parity, must support plural and gender; must avoid donor file structure copy.
   - Options:
     - ICU MessageFormat in JSON nested by namespace: rich plural/select handling, good tooling, web-friendly.
     - Gettext-style `.po` per module: mature ecosystem, mirrors Odoo layout (anti-copy hotspot), heavy tooling.
     - Flat JSON with manual plural keys: simple, but plural and gender become brittle.
   - Reco: ICU JSON nested by namespace; export/import via CSV for translation review.
   - Dépendance: every UI screen, notification templates, document rendering, error catalog.

5. Audit log destination.
   - Decision: where audit events live.
   - Context: append-only, queryable from admin UI, exportable, must survive load spikes.
   - Options:
     - Dedicated table inside primary DB with append-only constraint trigger: simple, transactional consistency with the business write, easy to query.
     - Separate append-only store (e.g. partitioned table or secondary DB): isolates write load, requires async pipeline.
     - External service (Loki/Vector/OpenSearch): great for retention and search at scale, dependency for self-hosted MVP, harder local dev.
   - Reco: Dedicated append-only table in primary DB for MVP, partitioned by month, with explicit migration path to external sink.
   - Dépendance: every write endpoint, export, retention policy.

6. Idempotency.
   - Decision: how to make critical writes safe to retry.
   - Context: invitations, password resets, role changes, tenant provisioning, integration retries.
   - Options:
     - Header `Idempotency-Key` validated against a short-lived store per actor: standard, explicit, predictable.
     - Business-level dedup keys (e.g. invitation token, email + state): less explicit, leaks into domain code.
     - None in MVP: cheapest, but tenant provisioning and invitations are exactly where double-submit happens.
   - Reco: `Idempotency-Key` header on the small set of sensitive endpoints (tenant create, invitation create, role change, password reset request) with 24h replay window.
   - Dépendance: API contract shared by every module; agentic runtime tool-call replay.

7. Password and MFA shape.
   - Decision: which authentication factors ship in MVP.
   - Context: FR-CA market mostly expects password + optional 2FA; passkey adoption rising but uneven.
   - Options:
     - Password + optional TOTP, mandatory TOTP for owners: covers main risk, low device friction.
     - Passkey-only: best security, breaks legacy clients and recovery flows.
     - Hybrid password + passkey + TOTP: flexible, more code paths and recovery edge cases.
   - Reco: Password + TOTP MVP, TOTP mandatory on owner role; reserve WebAuthn adapter for post-MVP.
   - Dépendance: account.profile screen, recovery flow, support-staff break-glass.

### Decision Register

```
- decision: "RBAC shape"
  options:
    - name: Flat role x permission
      pros: simple, deterministic, fast to audit
      cons: no inheritance, more grants stored
    - name: Hierarchical role inheritance
      pros: elegant admin UX
      cons: ambiguous audit, mimics Odoo group tree (anti-copy)
    - name: ABAC with conditions
      pros: future-proof
      cons: high complexity, hard to test in MVP
  reco: Flat role x permission, with reserved `conditions` JSON for later
  impact:
    licence: none
    timeline: +0j
    depend: every later module spec

- decision: "Multi-tenant isolation"
  options:
    - name: Schema-per-tenant
      pros: strong isolation, easy backup
      cons: migration fan-out, pool pressure
    - name: Row-level organization_id + middleware + RLS
      pros: low ops cost, scales, MVP friendly
      cons: requires discipline + integration tests
    - name: DB-per-tenant
      pros: maximum isolation
      cons: highest ops cost
  reco: Row-level with mandatory organization_id and Postgres RLS as defense in depth
  impact:
    licence: none
    timeline: +0j
    depend: all entities, migrations, queries, exports

- decision: "Auth transport"
  options:
    - name: HTTP-only secure cookie
      pros: simple, easy revocation, CSRF via SameSite
      cons: coupled to web host
    - name: Short-lived JWT + refresh
      pros: stateless, SDK-friendly
      cons: harder revocation, harder tenant switch
    - name: Hybrid cookie + refresh
      pros: balanced
      cons: two code paths
  reco: Cookie for MVP, hybrid reserved post-MVP when SDK ships
  impact:
    licence: none
    timeline: +0j
    depend: organization switcher, agentic runtime

- decision: "I18n catalog format"
  options:
    - name: ICU JSON nested
      pros: rich plural/select, web-friendly
      cons: tooling investment
    - name: gettext .po per module
      pros: mature
      cons: mirrors Odoo layout (anti-copy hotspot)
    - name: Flat JSON manual plural
      pros: simple
      cons: brittle plural/gender
  reco: ICU JSON nested, CSV import/export for review
  impact:
    licence: risk-mitigation (avoids Odoo .po per-module mimic)
    timeline: +0j
    depend: every UI screen and notification

- decision: "Audit log destination"
  options:
    - name: Dedicated append-only table in primary DB
      pros: transactional, simple
      cons: shares load with business writes
    - name: Separate partitioned store
      pros: isolates load
      cons: async pipeline complexity
    - name: External service (Loki/Vector/OpenSearch)
      pros: scale + search
      cons: self-hosted dependency
  reco: Dedicated append-only table partitioned by month, migration path to external sink
  impact:
    licence: none
    timeline: +0j
    depend: all write endpoints, retention policy

- decision: "Idempotency in MVP"
  options:
    - name: Idempotency-Key header on sensitive endpoints
      pros: explicit, standard, replay-safe
      cons: small storage and middleware cost
    - name: Business-level dedup
      pros: zero infra
      cons: leaks into domain
    - name: None in MVP
      pros: cheapest
      cons: invitations and provisioning duplicate
  reco: Idempotency-Key on tenant create, invitation create, role change, password reset request (24h window)
  impact:
    licence: none
    timeline: +1j
    depend: API contract, agentic tool-call replay

- decision: "Password and MFA shape"
  options:
    - name: Password + optional TOTP, mandatory for owners
      pros: covers main risk, low friction
      cons: no passkey
    - name: Passkey-only
      pros: best security
      cons: breaks legacy, recovery edges
    - name: Hybrid password + passkey + TOTP
      pros: flexible
      cons: more recovery edges
  reco: Password + TOTP MVP, WebAuthn adapter reserved post-MVP
  impact:
    licence: none
    timeline: +0j
    depend: profile screen, support break-glass

- decision: "FR-CA locale strategy"
  options:
    - name: fr-CA unique with NFC normalization
      pros: simple, predictable, matches Quebec expectation
      cons: no fallback variant
    - name: fr-CA + en-CA + accent normalization NFC/NFD on identifiers
      pros: parity, robust identifier matching
      cons: must enforce normalization across boundaries
    - name: fr (generic) with regional overrides
      pros: cheap
      cons: pulls France phrasing, mismatches Quebec audience
  reco: fr-CA + en-CA from day one, NFC normalization at write boundary for emails and identifiers
  impact:
    licence: none
    timeline: +0j
    depend: i18n catalog, email comparison, search

- decision: "Permission granularity"
  options:
    - name: Object-level only (resource.action.scope)
      pros: simple, testable, fast
      cons: no field-level secrets
    - name: Field-level only
      pros: fine-grained
      cons: complex, mimics Odoo ACL (anti-copy)
    - name: Object + selective field-level via record-policy hook
      pros: pragmatic
      cons: small dual surface
  reco: Object-level in MVP, abstract record-policy hook reserved for sensitive fields post-MVP
  impact:
    licence: risk-mitigation (avoids Odoo ir.model.fields mimic)
    timeline: +0j
    depend: every module field definition

- decision: "Org switching UX"
  options:
    - name: Persistent header selector
      pros: explicit, low friction
      cons: small header real estate
    - name: Redirect via sign-in page
      pros: simple
      cons: heavy, breaks flow
    - name: Subdomain per tenant
      pros: hard isolation
      cons: cookie/cors complexity, self-host friction
  reco: Persistent header selector with stale-tab protection
  impact:
    licence: none
    timeline: +0j
    depend: session model, audit event org.switch

- decision: "Audit log retention MVP"
  options:
    - name: 90 days
      pros: low cost
      cons: insufficient for audit cycles
    - name: 1 year
      pros: covers most internal cycles
      cons: medium storage
    - name: Configurable per tenant with default 1 year
      pros: flexible, future-proof
      cons: more settings surface
  reco: Configurable per tenant, default 1 year, hard floor 90 days
  impact:
    licence: none
    timeline: +1j
    depend: tenant settings, export pipeline

- decision: "Per-tenant branding"
  options:
    - name: MVP includes logo + primary color
      pros: differentiator
      cons: scope creep, asset storage
    - name: Post-MVP
      pros: keeps MVP lean
      cons: missing expectation for SaaS sales
    - name: White-label package post-MVP
      pros: clean separation
      cons: longer wait
  reco: Post-MVP; record placeholder in TenantSettings for `branding_state = none` to avoid future migration
  impact:
    licence: none
    timeline: +0j
    depend: tenant settings schema reservation
```

#### Anti-Copy Notes

- All donor inspirations recorded above are functional only; Odoo (LGPL) and Twenty (AGPL) influences are constrained to behavior, never source, schema names, XML views, `.po` layout, UI strings, or test fixtures.
- Aureus (MIT) reuse hooks are limited to architectural pattern inspiration with attribution notice retained in the NOTICE file; no plugin name, no demo data, no UI string is carried over.
- Internal field names in this spec are deliberately neutral (`organization_id`, `actor_user_id`, `before_summary`, `after_summary`) and do not mirror `res.company`, `res.users`, `mail.tracking.value`, or Twenty `workspaceMember` shapes.
