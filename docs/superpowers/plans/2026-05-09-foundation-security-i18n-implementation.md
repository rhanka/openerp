# OpenERP Foundation Security I18n Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first executable OpenERP foundation slice: tenant identity, users, roles, permissions, audit, FR/EN localization, settings, files, comments, notifications, and self-hosted update visibility.

**Architecture:** Start with a small monorepo that has one SvelteKit frontend, one TypeScript API service, one TypeScript worker service, shared domain contracts, shared i18n catalogs, PostgreSQL migrations, and Kubernetes-ready deployment files. The foundation module owns cross-cutting contracts that CRM, project/time, billing/accounting, reporting, automation, HR basics, and later manufacturing packs must consume instead of redefining.

**Tech Stack:** SvelteKit + TypeScript frontend, TypeScript API with Fastify-style route boundaries, PostgreSQL, SQL migrations, Node test runner or Vitest, Playwright for frontend smoke checks, Docker, Kubernetes manifests, MIT license.

---

## Avancement

Fait: study, MVP specs, anti-copy dossier, Canada/Quebec research, and final synthesis package are complete and pushed.
À faire: implement the first foundation slice from this plan; implementation planning is 100% once this file is committed.
Attendu: execute this plan with subagent-driven development, one task at a time, because the tasks have separate file ownership and verification gates.

## Progress Reporting Rule

Every execution checkpoint must use exactly this format:

```text
Fait: completed artifacts and verified facts.
À faire: remaining work and approximate completion percent.
Attendu: decision or action needed, with a recommendation.
```

If no user decision is needed, `Attendu` must say the next action the agent will take and why.

## Scope Check

This plan implements the platform foundation only. It does not implement CRM opportunity flows, project delivery, invoice posting, statutory payroll, reporting dashboards, typed automation workflows, manufacturing, MES, or WMS business logic.

The foundation must still expose the shared contracts those later modules require:

- `organization_id` and tenant guard on tenant-owned data;
- deny-by-default permissions using `resource.action.scope`;
- audit events for sensitive writes, exports, and update actions;
- FR/EN catalog validation;
- domain event naming and payload conventions;
- self-hosted version visibility and preflight hooks;
- file, comment, and notification primitives.

## Source Inputs

Use these OpenERP-authored documents as the only implementation prompt inputs:

- `docs/study/10-mvp-specs/foundation-security-i18n.md`
- `docs/study/10-mvp-specs/crm-customer-timeline.md`
- `docs/study/10-mvp-specs/project-time-to-invoice.md`
- `docs/study/10-mvp-specs/billing-accounting.md`
- `docs/study/10-mvp-specs/reporting-automation.md`
- `docs/study/08-anti-copy/anti-copy-dossier.md`
- `docs/study/09-canada-quebec/statutory-research.md`
- `docs/study/11-final-package/final-synthesis.md`

Do not implement from Odoo, Twenty, Frappe, Kimai, Superset, Node-RED, or other studied source trees. External projects may be mentioned in PR notes only as functional references already summarized in the OpenERP docs.

## Product Decisions Locked For This Plan

- License target: MIT.
- API style: REST/JSON first, with OpenAPI generation added after stable route contracts exist.
- Initial tenant isolation: shared PostgreSQL database with explicit `organization_id`, repository-level tenant guards, and database constraints; add database row-level policies before public SaaS launch.
- Auth shape: local email/password session for the first vertical slice, with an auth-provider boundary for later SSO.
- Localization: FR and EN are required before a UI route, API error, notification, document label, report label, or validation message is release-ready.
- Self-hosted deployment: Kubernetes manifests exist from the first slice; Helm can follow after manifests stabilize.
- Native payroll: outside this foundation implementation. Keep payroll-prep and statutory rule-pack boundaries only.

## Commit And Push Rule

Use standard `git` commands in this repository; `.git` points to the local git store already. Each implementation task must end with:

```bash
git status --short --branch
git add <task files>
git commit -m "<imperative task message>"
git push origin main
```

Do not combine unrelated tasks in one commit. If a task cannot be verified locally, commit only after the failure and residual risk are documented in the progress update.

## File Structure

Create and maintain these paths:

- `package.json`: root workspace scripts.
- `pnpm-workspace.yaml`: workspace package map.
- `tsconfig.base.json`: shared TypeScript settings.
- `.editorconfig`: editor defaults.
- `.gitignore`: keep generated outputs and local services out of git.
- `apps/api/package.json`: API package scripts and dependencies.
- `apps/api/src/server.ts`: API bootstrap.
- `apps/api/src/config/env.ts`: environment parsing.
- `apps/api/src/http/errors.ts`: stable API error response helpers.
- `apps/api/src/http/routes/foundation.ts`: foundation HTTP routes.
- `apps/api/src/security/password.ts`: password hashing boundary.
- `apps/api/src/security/session.ts`: session creation and lookup boundary.
- `apps/api/src/security/permissions.ts`: effective permission checks.
- `apps/api/src/db/client.ts`: PostgreSQL client factory.
- `apps/api/src/db/migrations/0001_foundation.sql`: foundation schema.
- `apps/api/src/foundation/repositories.ts`: tenant-scoped persistence functions.
- `apps/api/src/foundation/service.ts`: tenant setup, user, role, audit, file, comment, notification, and update-state workflows.
- `apps/api/test/foundation/*.test.ts`: API and service tests.
- `apps/worker/package.json`: worker package scripts and dependencies.
- `apps/worker/src/worker.ts`: domain event worker bootstrap.
- `apps/worker/src/handlers/foundation.ts`: notification, export, and update-preflight handlers.
- `apps/worker/test/foundation-worker.test.ts`: worker contract tests.
- `apps/web/package.json`: web package scripts and dependencies.
- `apps/web/src/routes/+layout.svelte`: authenticated operational shell.
- `apps/web/src/routes/+page.svelte`: foundation dashboard.
- `apps/web/src/routes/admin/users/+page.svelte`: user administration.
- `apps/web/src/routes/admin/roles/+page.svelte`: role administration.
- `apps/web/src/routes/admin/audit/+page.svelte`: audit log view.
- `apps/web/src/routes/admin/settings/+page.svelte`: organization settings and update state.
- `apps/web/src/lib/api/client.ts`: typed API client wrapper.
- `apps/web/src/lib/i18n.ts`: frontend i18n loader.
- `apps/web/src/lib/permissions.ts`: UI permission helpers.
- `apps/web/tests/foundation.spec.ts`: Playwright smoke checks.
- `packages/domain/package.json`: shared domain package.
- `packages/domain/src/foundation.ts`: domain entities, states, events, and permissions.
- `packages/domain/src/foundation.test.ts`: domain invariants.
- `packages/i18n/package.json`: shared i18n package.
- `packages/i18n/src/catalog.ts`: FR/EN catalog and lookup helpers.
- `packages/i18n/src/catalog.test.ts`: catalog completeness tests.
- `packages/i18n/src/foundation.en.json`: English strings.
- `packages/i18n/src/foundation.fr.json`: French strings.
- `scripts/validate-i18n.mjs`: catalog validation command.
- `docker-compose.yml`: local PostgreSQL and app dependencies.
- `infra/docker/api.Dockerfile`: API image.
- `infra/docker/web.Dockerfile`: web image.
- `infra/k8s/base/api-deployment.yaml`: API deployment.
- `infra/k8s/base/web-deployment.yaml`: web deployment.
- `infra/k8s/base/postgres-statefulset.yaml`: development self-hosted PostgreSQL baseline.
- `infra/k8s/base/update-state-configmap.yaml`: version and support-window config.
- `docs/implementation/foundation-security-i18n.md`: implementation notes and anti-copy checklist.

## Task 1: Workspace And Tooling Baseline

**Files:**

- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.editorconfig`
- Modify: `.gitignore`
- Create: `apps/api/package.json`
- Create: `apps/worker/package.json`
- Create: `apps/web/package.json`
- Create: `packages/domain/package.json`
- Create: `packages/i18n/package.json`

- [ ] **Step 1: Write the workspace smoke test**

Create `scripts/check-workspace.mjs`:

```js
import { existsSync, readFileSync } from "node:fs";

const requiredPaths = [
  "apps/api/package.json",
  "apps/worker/package.json",
  "apps/web/package.json",
  "packages/domain/package.json",
  "packages/i18n/package.json",
  "pnpm-workspace.yaml",
  "tsconfig.base.json"
];

for (const path of requiredPaths) {
  if (!existsSync(path)) {
    throw new Error(`Missing workspace path: ${path}`);
  }
}

const workspace = readFileSync("pnpm-workspace.yaml", "utf8");
for (const expected of ["apps/*", "packages/*"]) {
  if (!workspace.includes(expected)) {
    throw new Error(`pnpm workspace does not include ${expected}`);
  }
}
```

- [ ] **Step 2: Run the smoke test and verify it fails**

Run:

```bash
node scripts/check-workspace.mjs
```

Expected: FAIL with `Missing workspace path`.

- [ ] **Step 3: Create root workspace files**

Create `package.json`:

```json
{
  "name": "openerp",
  "private": true,
  "license": "MIT",
  "type": "module",
  "scripts": {
    "check:workspace": "node scripts/check-workspace.mjs",
    "check:i18n": "node scripts/validate-i18n.mjs",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "build": "pnpm -r build"
  },
  "packageManager": "pnpm"
}
```

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "resolveJsonModule": true,
    "skipLibCheck": true
  }
}
```

Create `.editorconfig`:

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
trim_trailing_whitespace = true
```

Append to `.gitignore` if absent:

```gitignore
node_modules/
.svelte-kit/
dist/
coverage/
.env
.env.*
!.env.example
```

- [ ] **Step 4: Create package manifests**

Create `apps/api/package.json`:

```json
{
  "name": "@openerp/api",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "lint": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@openerp/domain": "workspace:*",
    "@openerp/i18n": "workspace:*"
  },
  "devDependencies": {}
}
```

Create `apps/web/package.json`:

```json
{
  "name": "@openerp/web",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "vite build",
    "lint": "svelte-check --tsconfig ./tsconfig.json",
    "test": "vitest run"
  },
  "dependencies": {
    "@openerp/domain": "workspace:*",
    "@openerp/i18n": "workspace:*"
  },
  "devDependencies": {}
}
```

Create `apps/worker/package.json`:

```json
{
  "name": "@openerp/worker",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "lint": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@openerp/domain": "workspace:*",
    "@openerp/i18n": "workspace:*"
  },
  "devDependencies": {}
}
```

Create `packages/domain/package.json`:

```json
{
  "name": "@openerp/domain",
  "private": true,
  "type": "module",
  "main": "src/foundation.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "lint": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  }
}
```

Create `packages/i18n/package.json`:

```json
{
  "name": "@openerp/i18n",
  "private": true,
  "type": "module",
  "main": "src/catalog.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "lint": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  }
}
```

- [ ] **Step 5: Verify workspace smoke test passes**

Run:

```bash
node scripts/check-workspace.mjs
```

Expected: PASS with no output.

- [ ] **Step 6: Commit workspace baseline**

Run:

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json .editorconfig .gitignore scripts/check-workspace.mjs apps/api/package.json apps/worker/package.json apps/web/package.json packages/domain/package.json packages/i18n/package.json
git commit -m "Scaffold foundation workspace"
git push origin main
```

## Task 2: Domain Contracts And Invariants

**Files:**

- Create: `packages/domain/tsconfig.json`
- Create: `packages/domain/src/foundation.ts`
- Create: `packages/domain/src/foundation.test.ts`

- [ ] **Step 1: Write domain invariant tests**

Create `packages/domain/src/foundation.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  BASELINE_ROLES,
  FOUNDATION_EVENTS,
  FOUNDATION_PERMISSIONS,
  createPermissionKey,
  requiresAudit
} from "./foundation";

describe("foundation domain contracts", () => {
  it("defines every baseline role required by tenant setup", () => {
    expect(BASELINE_ROLES.map((role) => role.key)).toEqual([
      "owner",
      "admin",
      "manager",
      "standard_user",
      "auditor",
      "external_user"
    ]);
  });

  it("builds permission keys from resource, action, and scope", () => {
    expect(createPermissionKey("admin.user", "manage", "organization")).toBe(
      "admin.user.manage.organization"
    );
  });

  it("keeps foundation events available for audit and automation", () => {
    expect(FOUNDATION_EVENTS).toContain("organization.created");
    expect(FOUNDATION_EVENTS).toContain("system.update_preflight_requested");
  });

  it("requires audit for sensitive foundation actions", () => {
    expect(requiresAudit("user.roles_changed")).toBe(true);
    expect(requiresAudit("notification.sent")).toBe(false);
  });

  it("contains the permissions needed by admin and audit APIs", () => {
    expect(FOUNDATION_PERMISSIONS).toContain("admin.user.manage.organization");
    expect(FOUNDATION_PERMISSIONS).toContain("audit.event.read.organization");
  });
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
pnpm --filter @openerp/domain test
```

Expected: FAIL because `foundation.ts` is missing.

- [ ] **Step 3: Implement domain contracts**

Create `packages/domain/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*.ts"]
}
```

Create `packages/domain/src/foundation.ts` with these exported contracts:

```ts
export type LocaleCode = "en" | "fr";
export type UserStatus = "invited" | "active" | "deactivated";
export type OrganizationStatus = "active" | "suspended";
export type PermissionAction =
  | "read"
  | "write"
  | "delete"
  | "approve"
  | "post"
  | "export"
  | "manage";
export type PermissionScope = "own" | "team" | "organization" | "external" | "system";
export type PermissionKey = `${string}.${PermissionAction}.${PermissionScope}`;

export type SupportWindow = "under_12_months" | "between_12_and_24_months" | "over_24_months";

export interface Organization {
  id: string;
  legalName: string;
  displayName: string;
  slug: string;
  status: OrganizationStatus;
  defaultLocale: LocaleCode;
  defaultCurrency: string;
  defaultTimezone: string;
  country: string;
  provinceState: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenantSettings {
  organizationId: string;
  supportedLocales: LocaleCode[];
  primaryLocale: LocaleCode;
  taxRegion: string;
  fiscalYearStart: string;
  documentNumberingPolicy: string;
  retentionPolicy: string;
  selfHostedUpdateState: {
    currentVersion: string;
    latestSupportedVersion: string;
    supportWindow: SupportWindow;
    preflightRequired: boolean;
  };
}

export interface User {
  id: string;
  organizationId: string;
  email: string;
  displayName: string;
  preferredLocale: LocaleCode;
  status: UserStatus;
  mfaState: "not_configured" | "configured";
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoleDefinition {
  key: string;
  labelKey: string;
  systemRole: boolean;
}

export const BASELINE_ROLES: RoleDefinition[] = [
  { key: "owner", labelKey: "role.owner", systemRole: true },
  { key: "admin", labelKey: "role.admin", systemRole: true },
  { key: "manager", labelKey: "role.manager", systemRole: true },
  { key: "standard_user", labelKey: "role.standardUser", systemRole: true },
  { key: "auditor", labelKey: "role.auditor", systemRole: true },
  { key: "external_user", labelKey: "role.externalUser", systemRole: true }
];

export const FOUNDATION_PERMISSIONS: PermissionKey[] = [
  "admin.user.manage.organization",
  "admin.role.manage.organization",
  "admin.settings.manage.organization",
  "audit.event.read.organization",
  "audit.event.export.organization",
  "file.object.read.organization",
  "file.object.write.organization",
  "comment.thread.write.organization",
  "notification.message.read.own",
  "system.update.manage.organization"
];

export const FOUNDATION_EVENTS = [
  "organization.created",
  "organization.settings_changed",
  "user.invited",
  "user.activated",
  "user.deactivated",
  "user.roles_changed",
  "role.created",
  "role.updated",
  "file.uploaded",
  "comment.created",
  "notification.sent",
  "audit.exported",
  "system.update_preflight_requested"
] as const;

const AUDITED_EVENTS = new Set<string>([
  "organization.created",
  "organization.settings_changed",
  "user.invited",
  "user.activated",
  "user.deactivated",
  "user.roles_changed",
  "role.created",
  "role.updated",
  "file.uploaded",
  "audit.exported",
  "system.update_preflight_requested"
]);

export function createPermissionKey(
  resource: string,
  action: PermissionAction,
  scope: PermissionScope
): PermissionKey {
  return `${resource}.${action}.${scope}`;
}

export function requiresAudit(eventType: string): boolean {
  return AUDITED_EVENTS.has(eventType);
}
```

- [ ] **Step 4: Verify domain tests pass**

Run:

```bash
pnpm --filter @openerp/domain test
pnpm --filter @openerp/domain lint
```

Expected: PASS.

- [ ] **Step 5: Commit domain contracts**

Run:

```bash
git add packages/domain
git commit -m "Define foundation domain contracts"
git push origin main
```

## Task 3: FR/EN Catalog And Release Gate

**Files:**

- Create: `packages/i18n/tsconfig.json`
- Create: `packages/i18n/src/foundation.en.json`
- Create: `packages/i18n/src/foundation.fr.json`
- Create: `packages/i18n/src/catalog.ts`
- Create: `packages/i18n/src/catalog.test.ts`
- Create: `scripts/validate-i18n.mjs`

- [ ] **Step 1: Write catalog completeness tests**

Create `packages/i18n/src/catalog.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { catalog, getMessage, validateCatalogPair } from "./catalog";

describe("foundation i18n catalog", () => {
  it("contains matching English and French keys", () => {
    expect(validateCatalogPair(catalog.en, catalog.fr)).toEqual([]);
  });

  it("loads foundation role labels in both languages", () => {
    expect(getMessage("en", "role.owner")).toBe("Owner");
    expect(getMessage("fr", "role.owner")).toBe("Proprietaire");
  });

  it("rejects missing keys", () => {
    expect(validateCatalogPair({ a: "A" }, {})).toEqual(["fr:a"]);
  });
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
pnpm --filter @openerp/i18n test
```

Expected: FAIL because catalog files are missing.

- [ ] **Step 3: Create FR/EN catalogs and helper**

Create `packages/i18n/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*.ts", "src/**/*.json"]
}
```

Create `packages/i18n/src/foundation.en.json`:

```json
{
  "app.title": "OpenERP",
  "nav.settings": "Settings",
  "nav.users": "Users",
  "nav.roles": "Roles",
  "nav.audit": "Audit",
  "role.owner": "Owner",
  "role.admin": "Admin",
  "role.manager": "Manager",
  "role.standardUser": "Standard user",
  "role.auditor": "Auditor",
  "role.externalUser": "External user",
  "error.permissionDenied": "You do not have permission to perform this action.",
  "error.validation": "Some fields need attention.",
  "update.under12": "Supported",
  "update.between12And24": "Guided catch-up required",
  "update.over24": "Outside standard support"
}
```

Create `packages/i18n/src/foundation.fr.json`:

```json
{
  "app.title": "OpenERP",
  "nav.settings": "Parametres",
  "nav.users": "Utilisateurs",
  "nav.roles": "Roles",
  "nav.audit": "Audit",
  "role.owner": "Proprietaire",
  "role.admin": "Admin",
  "role.manager": "Gestionnaire",
  "role.standardUser": "Utilisateur standard",
  "role.auditor": "Auditeur",
  "role.externalUser": "Utilisateur externe",
  "error.permissionDenied": "Vous n'avez pas la permission d'effectuer cette action.",
  "error.validation": "Certains champs doivent etre corriges.",
  "update.under12": "Support standard",
  "update.between12And24": "Rattrapage guide requis",
  "update.over24": "Hors support standard"
}
```

Create `packages/i18n/src/catalog.ts`:

```ts
import en from "./foundation.en.json";
import fr from "./foundation.fr.json";

export type LocaleCode = "en" | "fr";
export type MessageCatalog = Record<string, string>;

export const catalog: Record<LocaleCode, MessageCatalog> = { en, fr };

export function validateCatalogPair(enCatalog: MessageCatalog, frCatalog: MessageCatalog): string[] {
  const missing: string[] = [];
  for (const key of Object.keys(enCatalog)) {
    if (!frCatalog[key]) missing.push(`fr:${key}`);
  }
  for (const key of Object.keys(frCatalog)) {
    if (!enCatalog[key]) missing.push(`en:${key}`);
  }
  return missing.sort();
}

export function getMessage(locale: LocaleCode, key: string): string {
  const message = catalog[locale][key];
  if (!message) {
    throw new Error(`Missing ${locale} message: ${key}`);
  }
  return message;
}
```

Create `scripts/validate-i18n.mjs`:

```js
import { readFileSync } from "node:fs";

const en = JSON.parse(readFileSync("packages/i18n/src/foundation.en.json", "utf8"));
const fr = JSON.parse(readFileSync("packages/i18n/src/foundation.fr.json", "utf8"));
const missing = [];

for (const key of Object.keys(en)) {
  if (!fr[key]) missing.push(`fr:${key}`);
}
for (const key of Object.keys(fr)) {
  if (!en[key]) missing.push(`en:${key}`);
}

if (missing.length > 0) {
  throw new Error(`Missing translations: ${missing.join(", ")}`);
}
```

- [ ] **Step 4: Verify catalog release gate**

Run:

```bash
pnpm --filter @openerp/i18n test
node scripts/validate-i18n.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit i18n catalog**

Run:

```bash
git add packages/i18n scripts/validate-i18n.mjs package.json
git commit -m "Add foundation bilingual catalog"
git push origin main
```

## Task 4: Database Schema And Tenant Guard

**Files:**

- Create: `apps/api/tsconfig.json`
- Create: `apps/api/src/db/client.ts`
- Create: `apps/api/src/db/migrations/0001_foundation.sql`
- Create: `apps/api/src/foundation/repositories.ts`
- Create: `apps/api/test/foundation/schema.test.ts`

- [ ] **Step 1: Write schema contract tests**

Create `apps/api/test/foundation/schema.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("src/db/migrations/0001_foundation.sql", "utf8");

describe("foundation migration", () => {
  it("creates all required foundation tables", () => {
    for (const table of [
      "organizations",
      "tenant_settings",
      "users",
      "teams",
      "roles",
      "permission_grants",
      "audit_events",
      "file_objects",
      "comments",
      "notifications",
      "domain_events"
    ]) {
      expect(migration).toContain(`create table ${table}`);
    }
  });

  it("stores organization_id on tenant-owned tables", () => {
    for (const table of ["users", "teams", "roles", "audit_events", "file_objects", "comments", "notifications", "domain_events"]) {
      const start = migration.indexOf(`create table ${table}`);
      const end = migration.indexOf(");", start);
      expect(migration.slice(start, end)).toContain("organization_id uuid not null");
    }
  });

  it("keeps audit events append-only by omitting update endpoints and update triggers", () => {
    expect(migration).not.toContain("update audit_events");
    expect(migration).not.toContain("delete from audit_events");
  });
});
```

- [ ] **Step 2: Run schema tests and verify they fail**

Run:

```bash
pnpm --filter @openerp/api test -- schema.test.ts
```

Expected: FAIL because migration is missing.

- [ ] **Step 3: Create API TypeScript config and DB client**

Create `apps/api/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*.ts", "test/**/*.ts"]
}
```

Create `apps/api/src/db/client.ts`:

```ts
export interface Queryable {
  query<T = unknown>(text: string, values?: unknown[]): Promise<{ rows: T[] }>;
}

export interface TenantContext {
  organizationId: string;
  actorUserId: string;
}

export function assertTenantContext(context: TenantContext): void {
  if (!context.organizationId || !context.actorUserId) {
    throw new Error("Tenant context requires organizationId and actorUserId");
  }
}
```

- [ ] **Step 4: Create foundation migration**

Create `apps/api/src/db/migrations/0001_foundation.sql` with:

```sql
create extension if not exists pgcrypto;

create table organizations (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  display_name text not null,
  slug text not null unique,
  status text not null check (status in ('active', 'suspended')),
  default_locale text not null check (default_locale in ('en', 'fr')),
  default_currency text not null,
  default_timezone text not null,
  country text not null,
  province_state text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table tenant_settings (
  organization_id uuid primary key references organizations(id),
  supported_locales text[] not null,
  primary_locale text not null check (primary_locale in ('en', 'fr')),
  tax_region text not null,
  fiscal_year_start text not null,
  document_numbering_policy jsonb not null,
  retention_policy jsonb not null,
  self_hosted_update_state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table users (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  email text not null,
  display_name text not null,
  preferred_locale text not null check (preferred_locale in ('en', 'fr')),
  status text not null check (status in ('invited', 'active', 'deactivated')),
  password_hash text,
  mfa_state text not null default 'not_configured',
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, email)
);

create table teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  name text not null,
  parent_team_id uuid references teams(id),
  manager_user_id uuid references users(id),
  status text not null default 'active'
);

create table roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  name text not null,
  description text not null,
  system_role boolean not null,
  status text not null default 'active',
  unique (organization_id, name)
);

create table permission_grants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  role_id uuid references roles(id),
  user_id uuid references users(id),
  resource text not null,
  action text not null,
  scope text not null,
  conditions jsonb not null default '{}',
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  check (role_id is not null or user_id is not null)
);

create table audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  actor_user_id uuid references users(id),
  actor_type text not null,
  action text not null,
  resource_type text not null,
  resource_id text not null,
  before_summary jsonb,
  after_summary jsonb,
  ip_hash text,
  user_agent_hash text,
  created_at timestamptz not null default now()
);

create table file_objects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  storage_key text not null,
  filename text not null,
  content_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  checksum text not null,
  visibility_scope text not null,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  resource_type text not null,
  resource_id text not null,
  body text not null,
  visibility text not null,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  recipient_user_id uuid not null references users(id),
  channel text not null,
  subject_key text not null,
  body_key text not null,
  payload jsonb not null default '{}',
  status text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table domain_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  event_type text not null,
  resource_type text not null,
  resource_id text not null,
  payload_summary jsonb not null default '{}',
  emitted_at timestamptz not null default now(),
  consumed_at timestamptz
);

create index audit_events_org_created_idx on audit_events (organization_id, created_at desc);
create index domain_events_org_type_idx on domain_events (organization_id, event_type, emitted_at desc);
```

- [ ] **Step 5: Implement tenant guard helper**

Create `apps/api/src/foundation/repositories.ts`:

```ts
import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";

export async function listAuditEvents(db: Queryable, context: TenantContext, limit = 50) {
  assertTenantContext(context);
  const result = await db.query(
    `select id, action, resource_type, resource_id, created_at
       from audit_events
      where organization_id = $1
      order by created_at desc
      limit $2`,
    [context.organizationId, limit]
  );
  return result.rows;
}

export async function getCurrentOrganization(db: Queryable, context: TenantContext) {
  assertTenantContext(context);
  const result = await db.query(
    `select id, display_name, default_locale, default_currency, default_timezone, country, province_state
       from organizations
      where id = $1`,
    [context.organizationId]
  );
  return result.rows[0] ?? null;
}
```

- [ ] **Step 6: Verify schema contract**

Run:

```bash
pnpm --filter @openerp/api test -- schema.test.ts
pnpm --filter @openerp/api lint
```

Expected: PASS.

- [ ] **Step 7: Commit database foundation**

Run:

```bash
git add apps/api
git commit -m "Add foundation database contracts"
git push origin main
```

## Task 5: Permission And Audit Service

**Files:**

- Create: `apps/api/src/security/permissions.ts`
- Create: `apps/api/src/foundation/service.ts`
- Create: `apps/api/test/foundation/permissions.test.ts`
- Create: `apps/api/test/foundation/audit.test.ts`

- [ ] **Step 1: Write permission tests**

Create `apps/api/test/foundation/permissions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { can, denyByDefault, type EffectivePermission } from "../../src/security/permissions";

const grants: EffectivePermission[] = [
  { resource: "admin.user", action: "manage", scope: "organization" },
  { resource: "audit.event", action: "read", scope: "organization" }
];

describe("permission checks", () => {
  it("allows matching resource action and scope", () => {
    expect(can(grants, "admin.user", "manage", "organization")).toBe(true);
  });

  it("denies missing permissions by default", () => {
    expect(can(grants, "finance.invoice", "issue", "organization")).toBe(false);
    expect(denyByDefault([])).toBe(true);
  });
});
```

- [ ] **Step 2: Write audit service tests**

Create `apps/api/test/foundation/audit.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createAuditEventInput } from "../../src/foundation/service";

describe("audit service", () => {
  it("creates append-only audit event input with tenant and actor", () => {
    expect(
      createAuditEventInput({
        organizationId: "org_1",
        actorUserId: "user_1",
        action: "user.roles_changed",
        resourceType: "user",
        resourceId: "user_2",
        beforeSummary: { roles: ["standard_user"] },
        afterSummary: { roles: ["admin"] }
      })
    ).toMatchObject({
      organizationId: "org_1",
      actorUserId: "user_1",
      actorType: "user",
      action: "user.roles_changed"
    });
  });
});
```

- [ ] **Step 3: Run tests and verify they fail**

Run:

```bash
pnpm --filter @openerp/api test -- permissions.test.ts audit.test.ts
```

Expected: FAIL because service files are missing.

- [ ] **Step 4: Implement permission helpers**

Create `apps/api/src/security/permissions.ts`:

```ts
import type { PermissionAction, PermissionScope } from "@openerp/domain";

export interface EffectivePermission {
  resource: string;
  action: PermissionAction;
  scope: PermissionScope;
}

export function can(
  grants: EffectivePermission[],
  resource: string,
  action: PermissionAction,
  scope: PermissionScope
): boolean {
  return grants.some(
    (grant) => grant.resource === resource && grant.action === action && grant.scope === scope
  );
}

export function denyByDefault(grants: EffectivePermission[]): boolean {
  return grants.length === 0;
}
```

- [ ] **Step 5: Implement audit input helper**

Create `apps/api/src/foundation/service.ts`:

```ts
export interface CreateAuditEventParams {
  organizationId: string;
  actorUserId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  beforeSummary?: Record<string, unknown>;
  afterSummary?: Record<string, unknown>;
}

export function createAuditEventInput(params: CreateAuditEventParams) {
  return {
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    actorType: "user",
    action: params.action,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    beforeSummary: params.beforeSummary ?? null,
    afterSummary: params.afterSummary ?? null
  };
}
```

- [ ] **Step 6: Verify service tests**

Run:

```bash
pnpm --filter @openerp/api test -- permissions.test.ts audit.test.ts
pnpm --filter @openerp/api lint
```

Expected: PASS.

- [ ] **Step 7: Commit permission and audit service**

Run:

```bash
git add apps/api/src/security/permissions.ts apps/api/src/foundation/service.ts apps/api/test/foundation
git commit -m "Implement foundation permission and audit helpers"
git push origin main
```

## Task 6: Foundation HTTP API Slice

**Files:**

- Create: `apps/api/src/config/env.ts`
- Create: `apps/api/src/http/errors.ts`
- Create: `apps/api/src/http/routes/foundation.ts`
- Create: `apps/api/src/server.ts`
- Create: `apps/api/test/foundation/routes.test.ts`

- [ ] **Step 1: Write route contract tests**

Create `apps/api/test/foundation/routes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildFoundationRoutes } from "../../src/http/routes/foundation";

describe("foundation route registry", () => {
  it("registers required MVP endpoints", () => {
    expect(buildFoundationRoutes().map((route) => `${route.method} ${route.path}`)).toEqual([
      "GET /me",
      "GET /organizations/current",
      "PATCH /organizations/current/settings",
      "GET /users",
      "POST /users/invitations",
      "PATCH /users/:id",
      "GET /roles",
      "POST /roles",
      "PATCH /roles/:id",
      "GET /permissions/effective",
      "GET /audit-events",
      "POST /files",
      "GET /files/:id",
      "POST /comments",
      "GET /notifications",
      "PATCH /notifications/:id",
      "GET /i18n/catalog",
      "GET /system/update-state"
    ]);
  });
});
```

- [ ] **Step 2: Run route tests and verify they fail**

Run:

```bash
pnpm --filter @openerp/api test -- routes.test.ts
```

Expected: FAIL because route registry is missing.

- [ ] **Step 3: Implement route registry and error contract**

Create `apps/api/src/http/errors.ts`:

```ts
export interface ApiErrorBody {
  code: string;
  messageKey: string;
  details?: Record<string, unknown>;
}

export function permissionDenied(): ApiErrorBody {
  return {
    code: "permission_denied",
    messageKey: "error.permissionDenied"
  };
}

export function validationError(details: Record<string, unknown>): ApiErrorBody {
  return {
    code: "validation_error",
    messageKey: "error.validation",
    details
  };
}
```

Create `apps/api/src/http/routes/foundation.ts`:

```ts
export interface RouteContract {
  method: "GET" | "POST" | "PATCH";
  path: string;
  audited: boolean;
}

export function buildFoundationRoutes(): RouteContract[] {
  return [
    { method: "GET", path: "/me", audited: false },
    { method: "GET", path: "/organizations/current", audited: false },
    { method: "PATCH", path: "/organizations/current/settings", audited: true },
    { method: "GET", path: "/users", audited: false },
    { method: "POST", path: "/users/invitations", audited: true },
    { method: "PATCH", path: "/users/:id", audited: true },
    { method: "GET", path: "/roles", audited: false },
    { method: "POST", path: "/roles", audited: true },
    { method: "PATCH", path: "/roles/:id", audited: true },
    { method: "GET", path: "/permissions/effective", audited: false },
    { method: "GET", path: "/audit-events", audited: false },
    { method: "POST", path: "/files", audited: true },
    { method: "GET", path: "/files/:id", audited: false },
    { method: "POST", path: "/comments", audited: false },
    { method: "GET", path: "/notifications", audited: false },
    { method: "PATCH", path: "/notifications/:id", audited: false },
    { method: "GET", path: "/i18n/catalog", audited: false },
    { method: "GET", path: "/system/update-state", audited: false }
  ];
}
```

Create `apps/api/src/config/env.ts`:

```ts
export interface ApiEnv {
  databaseUrl: string;
  sessionSecret: string;
  appVersion: string;
}

export function readApiEnv(env: NodeJS.ProcessEnv): ApiEnv {
  const databaseUrl = env.DATABASE_URL;
  const sessionSecret = env.SESSION_SECRET;
  const appVersion = env.APP_VERSION ?? "0.0.0-dev";
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  if (!sessionSecret) throw new Error("SESSION_SECRET is required");
  return { databaseUrl, sessionSecret, appVersion };
}
```

Create `apps/api/src/server.ts`:

```ts
import { buildFoundationRoutes } from "./http/routes/foundation";

export function describeApi() {
  return {
    name: "OpenERP API",
    routes: buildFoundationRoutes()
  };
}
```

- [ ] **Step 4: Verify API route contracts**

Run:

```bash
pnpm --filter @openerp/api test -- routes.test.ts
pnpm --filter @openerp/api lint
```

Expected: PASS.

- [ ] **Step 5: Commit API slice**

Run:

```bash
git add apps/api/src apps/api/test/foundation/routes.test.ts
git commit -m "Define foundation API contracts"
git push origin main
```

## Task 7: Svelte Foundation Admin Shell

**Files:**

- Create: `apps/web/tsconfig.json`
- Create: `apps/web/src/lib/api/client.ts`
- Create: `apps/web/src/lib/i18n.ts`
- Create: `apps/web/src/lib/permissions.ts`
- Create: `apps/web/src/routes/+layout.svelte`
- Create: `apps/web/src/routes/+page.svelte`
- Create: `apps/web/src/routes/admin/users/+page.svelte`
- Create: `apps/web/src/routes/admin/roles/+page.svelte`
- Create: `apps/web/src/routes/admin/audit/+page.svelte`
- Create: `apps/web/src/routes/admin/settings/+page.svelte`
- Create: `apps/web/tests/foundation.spec.ts`

- [ ] **Step 1: Write Playwright smoke checks**

Create `apps/web/tests/foundation.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("foundation shell exposes admin navigation without layout overlap", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "OpenERP" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Roles" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Audit" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();
});
```

- [ ] **Step 2: Run smoke check and verify it fails**

Run:

```bash
pnpm --filter @openerp/web test
```

Expected: FAIL because Svelte routes are missing.

- [ ] **Step 3: Create web helpers**

Create `apps/web/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "isolatedModules": true
  },
  "include": ["src/**/*.ts", "src/**/*.svelte", "tests/**/*.ts"]
}
```

Create `apps/web/src/lib/api/client.ts`:

```ts
export interface ApiClientOptions {
  baseUrl: string;
}

export function createApiClient(options: ApiClientOptions) {
  return {
    async getCurrentOrganization() {
      const response = await fetch(`${options.baseUrl}/organizations/current`);
      if (!response.ok) throw new Error("organization_load_failed");
      return response.json();
    }
  };
}
```

Create `apps/web/src/lib/i18n.ts`:

```ts
import { getMessage, type LocaleCode } from "@openerp/i18n";

export function t(locale: LocaleCode, key: string): string {
  return getMessage(locale, key);
}
```

Create `apps/web/src/lib/permissions.ts`:

```ts
export function canSeeAdminNav(permissionKeys: string[]): boolean {
  return permissionKeys.some((key) => key.startsWith("admin.") || key.startsWith("audit."));
}
```

- [ ] **Step 4: Create operational shell pages**

Create `apps/web/src/routes/+layout.svelte` with a compact admin shell, fixed sidebar width, responsive content area, and navigation links for Users, Roles, Audit, and Settings. Use text from the i18n helper and avoid marketing-style hero layout.

Create `apps/web/src/routes/+page.svelte` with a dashboard that shows tenant name, update support window, user count from route data, role count from route data, latest audit event summary, and i18n locale toggle.

Create each admin page with dense operational tables:

- `admin/users`: email, display name, locale, status, roles, actions.
- `admin/roles`: role, description, system role, permissions count, status.
- `admin/audit`: timestamp, actor, action, resource, export button gated by permission.
- `admin/settings`: organization locale, currency, timezone, tax region, fiscal year start, update support window, preflight action.

- [ ] **Step 5: Verify web checks**

Run:

```bash
pnpm --filter @openerp/web lint
pnpm --filter @openerp/web test
```

Expected: PASS.

- [ ] **Step 6: Visual verification**

Start the web app and inspect desktop and mobile with Playwright MCP or Playwright screenshots. Confirm:

- no overlapping navigation or table text;
- FR/EN labels render;
- admin pages are operational screens, not landing pages;
- update support window is visible in settings.

- [ ] **Step 7: Commit web foundation shell**

Run:

```bash
git add apps/web
git commit -m "Add foundation admin web shell"
git push origin main
```

## Task 8: Foundation Worker Contracts

**Files:**

- Create: `apps/worker/tsconfig.json`
- Create: `apps/worker/src/worker.ts`
- Create: `apps/worker/src/handlers/foundation.ts`
- Create: `apps/worker/test/foundation-worker.test.ts`

- [ ] **Step 1: Write worker contract tests**

Create `apps/worker/test/foundation-worker.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildFoundationWorkerHandlers, shouldRetryWorkerRun } from "../src/handlers/foundation";

describe("foundation worker handlers", () => {
  it("registers async handlers for foundation side effects", () => {
    expect(buildFoundationWorkerHandlers().map((handler) => handler.eventType)).toEqual([
      "notification.sent",
      "audit.exported",
      "system.update_preflight_requested"
    ]);
  });

  it("retries only retryable worker states", () => {
    expect(shouldRetryWorkerRun("failed_retryable")).toBe(true);
    expect(shouldRetryWorkerRun("failed_final")).toBe(false);
  });
});
```

- [ ] **Step 2: Run worker tests and verify they fail**

Run:

```bash
pnpm --filter @openerp/worker test
```

Expected: FAIL because worker handlers are missing.

- [ ] **Step 3: Create worker TypeScript config**

Create `apps/worker/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*.ts", "test/**/*.ts"]
}
```

- [ ] **Step 4: Implement worker handler registry**

Create `apps/worker/src/handlers/foundation.ts`:

```ts
export type WorkerRunState = "queued" | "running" | "succeeded" | "failed_retryable" | "failed_final";

export interface FoundationWorkerHandler {
  eventType: "notification.sent" | "audit.exported" | "system.update_preflight_requested";
  sideEffect: "notification_delivery" | "export_file_generation" | "update_preflight";
  audited: boolean;
}

export function buildFoundationWorkerHandlers(): FoundationWorkerHandler[] {
  return [
    { eventType: "notification.sent", sideEffect: "notification_delivery", audited: false },
    { eventType: "audit.exported", sideEffect: "export_file_generation", audited: true },
    { eventType: "system.update_preflight_requested", sideEffect: "update_preflight", audited: true }
  ];
}

export function shouldRetryWorkerRun(state: WorkerRunState): boolean {
  return state === "failed_retryable";
}
```

Create `apps/worker/src/worker.ts`:

```ts
import { buildFoundationWorkerHandlers } from "./handlers/foundation";

export function describeWorker() {
  return {
    name: "OpenERP Foundation Worker",
    handlers: buildFoundationWorkerHandlers()
  };
}
```

- [ ] **Step 5: Verify worker contracts**

Run:

```bash
pnpm --filter @openerp/worker test
pnpm --filter @openerp/worker lint
```

Expected: PASS.

- [ ] **Step 6: Commit worker contracts**

Run:

```bash
git add apps/worker
git commit -m "Define foundation worker contracts"
git push origin main
```

## Task 9: Self-Hosted Docker And Kubernetes Baseline

**Files:**

- Create: `docker-compose.yml`
- Create: `infra/docker/api.Dockerfile`
- Create: `infra/docker/worker.Dockerfile`
- Create: `infra/docker/web.Dockerfile`
- Create: `infra/k8s/base/api-deployment.yaml`
- Create: `infra/k8s/base/worker-deployment.yaml`
- Create: `infra/k8s/base/web-deployment.yaml`
- Create: `infra/k8s/base/postgres-statefulset.yaml`
- Create: `infra/k8s/base/update-state-configmap.yaml`
- Create: `apps/api/test/foundation/update-state.test.ts`

- [ ] **Step 1: Write update-state tests**

Create `apps/api/test/foundation/update-state.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { classifySupportWindow } from "../../src/foundation/update-state";

describe("self-hosted update support window", () => {
  it("classifies supported, catch-up, and outside support windows", () => {
    expect(classifySupportWindow(6)).toBe("under_12_months");
    expect(classifySupportWindow(18)).toBe("between_12_and_24_months");
    expect(classifySupportWindow(25)).toBe("over_24_months");
  });
});
```

- [ ] **Step 2: Run update-state test and verify it fails**

Run:

```bash
pnpm --filter @openerp/api test -- update-state.test.ts
```

Expected: FAIL because `update-state` is missing.

- [ ] **Step 3: Implement update-state helper**

Create `apps/api/src/foundation/update-state.ts`:

```ts
import type { SupportWindow } from "@openerp/domain";

export function classifySupportWindow(monthsBehind: number): SupportWindow {
  if (monthsBehind < 12) return "under_12_months";
  if (monthsBehind <= 24) return "between_12_and_24_months";
  return "over_24_months";
}
```

- [ ] **Step 4: Create local compose baseline**

Create `docker-compose.yml` with services:

- `postgres`: PostgreSQL database with a named volume, healthcheck, and local-only published port.
- `api`: API container using `infra/docker/api.Dockerfile`, `DATABASE_URL`, `SESSION_SECRET`, and `APP_VERSION`.
- `worker`: worker container using `infra/docker/worker.Dockerfile`, `DATABASE_URL`, `SESSION_SECRET`, and `APP_VERSION`.
- `web`: web container using `infra/docker/web.Dockerfile`, depending on API.

- [ ] **Step 5: Create Kubernetes manifests**

Create `infra/k8s/base/update-state-configmap.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: openerp-update-state
data:
  currentVersion: "0.0.0-dev"
  latestSupportedVersion: "0.0.0-dev"
  supportWindow: "under_12_months"
```

Create API, worker, and web deployments with:

- namespace-neutral resources;
- environment variables from ConfigMap and Secret references;
- HTTP readiness probes;
- resource requests and limits;
- labels `app.kubernetes.io/name: openerp`.

Create `postgres-statefulset.yaml` as a development self-hosted baseline only, with comments stating production operators should provide managed PostgreSQL or a reviewed database operator.

- [ ] **Step 6: Verify deployment files**

Run:

```bash
rg -n "openerp-update-state|worker-deployment|readinessProbe|app.kubernetes.io/name|currentVersion|latestSupportedVersion|supportWindow" infra/k8s docker-compose.yml
pnpm --filter @openerp/api test -- update-state.test.ts
```

Expected: output shows update-state config, probes, labels, and tests pass.

- [ ] **Step 7: Commit self-hosted baseline**

Run:

```bash
git add docker-compose.yml infra apps/api/src/foundation/update-state.ts apps/api/test/foundation/update-state.test.ts
git commit -m "Add self-hosted foundation baseline"
git push origin main
```

## Task 10: Anti-Copy And Implementation Notes

**Files:**

- Create: `docs/implementation/foundation-security-i18n.md`
- Modify: `README.md`

- [ ] **Step 1: Create implementation notes**

Create `docs/implementation/foundation-security-i18n.md`:

```markdown
# Foundation Security I18n Implementation Notes

## Source Of Truth

Implementation starts from `docs/study/10-mvp-specs/foundation-security-i18n.md`.

## Anti-Copy Gate

- No third-party source code, schemas, API contracts, UI strings, tests, demo data, reports, templates, screenshots, or module layouts were used as implementation inputs.
- GPL and AGPL projects are functional references only through OpenERP-written specs.
- MIT, Apache-2.0, and BSD references require attribution notes before any direct reuse.
- Every PR touching domain behavior must name the OpenERP spec section it implements.

## Acceptance Coverage

- Tenant setup creates baseline roles and owner.
- Zero active owners is blocked.
- Permissions deny by default.
- Role changes write audit events.
- FR and EN catalogs must match before release.
- Self-hosted update state exposes the three support windows.
- Audit events are append-only through public APIs.
```

- [ ] **Step 2: Update README**

Add a short implementation section to `README.md` pointing to:

- the final synthesis;
- this implementation plan;
- the foundation implementation notes;
- the progress reporting rule.

- [ ] **Step 3: Verify anti-copy wording and forbidden assessment wording**

Run:

```bash
rg -n "Anti-Copy Gate|functional references only|foundation-security-i18n" README.md docs/implementation/foundation-security-i18n.md
rg -n "$(printf '%s' 'sco''re|sco''ring|weight''ed|pond[eé]r|rank''ing|rank''ed|rank''ings')" docs README.md
```

Expected: first command prints implementation references. Second command prints no matches.

- [ ] **Step 4: Commit implementation notes**

Run:

```bash
git add README.md docs/implementation/foundation-security-i18n.md
git commit -m "Document foundation implementation controls"
git push origin main
```

## Task 11: Full Verification Before First App Build

**Files:**

- Modify only if verification exposes a concrete defect in earlier task files.

- [ ] **Step 1: Run full repository checks**

Run:

```bash
node scripts/check-workspace.mjs
node scripts/validate-i18n.mjs
pnpm -r lint
pnpm -r test
pnpm -r build
```

Expected: all commands pass.

- [ ] **Step 2: Run forbidden wording scan**

Run:

```bash
rg -n "$(printf '%s' 'sco''re|sco''ring|weight''ed|pond[eé]r|rank''ing|rank''ed|rank''ings')" docs README.md
```

Expected: no matches.

- [ ] **Step 3: Inspect git state**

Run:

```bash
git status --short --branch
```

Expected: branch is `main`, aligned with `origin/main`, with no unexpected files.

- [ ] **Step 4: Push final task state**

Run:

```bash
git push origin main
```

Expected: push succeeds or reports `Everything up-to-date`.

## Execution Notes For Parallel Agents

Use separate agents only on disjoint ownership:

- Agent A can own Task 1 and package workspace files.
- Agent B can own Task 2 and `packages/domain`.
- Agent C can own Task 3 and `packages/i18n`.
- Agent D can own Task 4 through Task 6 under `apps/api`.
- Agent E can own Task 7 under `apps/web`.
- Agent F can own Task 8 under `apps/worker`.
- Agent G can own Task 9 under `infra`, `docker-compose.yml`, and update-state helper.
- Agent H can own Task 10 docs only.

When two tasks touch the same package manifest, integrate sequentially after reviewing diffs. Do not let agents rewrite files outside their assigned ownership. Every agent must commit only after local verification for its task and must push to `main` after the commit unless another integration commit is in progress.

## Self-Review Checklist

- Spec coverage: the plan covers organization setup, tenant settings, users, roles, permissions, audit events, files, comments, notifications, i18n catalog, update state, API routes, worker side effects, and Kubernetes baseline.
- Anti-copy coverage: the plan requires implementation from OpenERP specs only and adds a pre-merge control note.
- Canada/Quebec coverage: the plan includes locale, GST/HST/QST-ready settings, tax region fields, and excludes native payroll.
- Release readiness: every feature has FR/EN catalog checks, tests, and a verification command.
