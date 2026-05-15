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
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type PayloadSummary = Record<string, JsonValue>;

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

export interface Team {
  id: string;
  organizationId: string;
  name: string;
  parentTeamId: string | null;
  managerUserId: string | null;
  status: "active" | "inactive";
}

export interface RoleDefinition {
  key: string;
  labelKey: string;
  systemRole: boolean;
}

export interface Role {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  systemRole: boolean;
  status: "active" | "inactive";
}

export interface PermissionGrant {
  id: string;
  organizationId: string;
  roleId: string | null;
  userId: string | null;
  resource: string;
  action: PermissionAction;
  scope: PermissionScope;
  conditions: PayloadSummary;
  createdByUserId: string;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  organizationId: string;
  actorUserId: string | null;
  actorType: "user" | "system" | "operator";
  action: string;
  resourceType: string;
  resourceId: string;
  beforeSummary: PayloadSummary | null;
  afterSummary: PayloadSummary | null;
  ipHash: string | null;
  userAgentHash: string | null;
  createdAt: string;
  // Agentic extension (canon PG-09 / shared-entities-v1.md), optional for backward compat
  source?: ActorSource | null;
  agentId?: string | null;
  toolCallId?: string | null;
  policyDecisionId?: string | null;
  delegationId?: string | null;
  approvalRequestId?: string | null;
}

export interface FileObject {
  id: string;
  organizationId: string;
  storageKey: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  checksum: string;
  visibilityScope: PermissionScope;
  createdByUserId: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  organizationId: string;
  resourceType: string;
  resourceId: string;
  body: string;
  visibility: "internal" | "external";
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  organizationId: string;
  recipientUserId: string;
  channel: "in_app" | "email";
  subjectKey: string;
  bodyKey: string;
  payload: PayloadSummary;
  status: "queued" | "sent" | "read" | "failed";
  createdAt: string;
  readAt: string | null;
}

export interface TranslationKey {
  key: string;
  namespace: string;
  enText: string;
  frText: string;
  description: string;
  status: "draft" | "active";
  updatedAt: string;
}

export interface DomainEvent {
  id: string;
  organizationId: string;
  eventType: string;
  resourceType: string;
  resourceId: string;
  payloadSummary: PayloadSummary;
  emittedAt: string;
  consumedAt: string | null;
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

// =============================================================================
// Canon entities (shared-entities-v1.md) — added 2026-05-14 per arbitrage closure
// PG-02 (identity), PG-06 (canon entities), PG-07 (ApprovalRequest), PG-08 (Idempotency)
// =============================================================================

export type ActorSource = "human" | "agent" | "system";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "escalated" | "expired";
export type ApprovalUrgency = "low" | "normal" | "high";
export type MfaState = "not_configured" | "passkey" | "totp";

/** Money — canon PG-06 article 1.
 *  amountMinor stored as number in TS payloads; use bigint/decimal at DB layer.
 *  Example: USD 12.34 = { amountMinor: 1234, currency: "USD", scale: 2 } */
export interface Money {
  amountMinor: number;
  currency: string;
  scale: number;
}

/** FxRateSnapshot — canon PG-06 article 1.
 *  Rate stored as decimal string for precision. Foundation service currency.resolve() returns this. */
export interface FxRateSnapshot {
  id: string;
  organizationId: string;
  sourceCurrency: string;
  targetCurrency: string;
  rate: string;
  effectiveAt: string;
  source: string;
}

/** UserIdentity — canon PG-02. Global identity (auth/email/MFA). Distinct from membership per tenant. */
export interface UserIdentity {
  id: string;
  email: string;
  displayName: string;
  preferredLocale: LocaleCode;
  mfaState: MfaState;
  status: UserStatus;
  actorType: ActorSource;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

/** OrganizationMember — canon PG-02. Per-tenant membership (statut, locale override, rôles). */
export interface OrganizationMember {
  id: string;
  userIdentityId: string;
  organizationId: string;
  status: UserStatus;
  preferredLocale: LocaleCode | null;
  joinedAt: string;
  updatedAt: string;
}

/** TimelineEntry — canon PG-06 article 2. Projection lisible par humain (vs AuditEvent compliance + DomainEvent intégration). */
export interface TimelineEntry {
  id: string;
  organizationId: string;
  resourceType: string;
  resourceId: string;
  actorUserIdentityId: string | null;
  entryType: string;
  payloadSummary: PayloadSummary;
  occurredAt: string;
}

/** ApprovalRequest — canon PG-07. Entité foundation partagée, exposée via REST + MCP tool + SDK. */
export interface ApprovalRequest {
  id: string;
  organizationId: string;
  requesterUserIdentityId: string;
  approverUserIdentityId: string | null;
  approverRoleId: string | null;
  subjectType: string;
  subjectId: string;
  reason: string;
  urgency: ApprovalUrgency;
  status: ApprovalStatus;
  decisionReason: string | null;
  decidedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

/** IdempotencyRecord — canon PG-08. Middleware foundation pour POST/DELETE side-effect. TTL 24h. */
export interface IdempotencyRecord {
  organizationId: string;
  key: string;
  requestHash: string;
  responseBodyHash: string;
  statusCode: number;
  createdAt: string;
  expiresAt: string;
}

/** Build a Money value with minor units. Throws if currency code is not 3 chars. */
export function makeMoney(amountMinor: number, currency: string, scale = 2): Money {
  if (currency.length !== 3) {
    throw new Error(`Money currency must be ISO 4217 (3 chars), got '${currency}'`);
  }
  if (!Number.isInteger(amountMinor)) {
    throw new Error(`Money amountMinor must be an integer, got ${amountMinor}`);
  }
  if (!Number.isInteger(scale) || scale < 0) {
    throw new Error(`Money scale must be a non-negative integer, got ${scale}`);
  }
  return { amountMinor, currency: currency.toUpperCase(), scale };
}

/** Check that two Money values share the same currency before arithmetic. */
export function sameCurrency(a: Money, b: Money): boolean {
  return a.currency === b.currency && a.scale === b.scale;
}

// Re-export foundation abstraction contracts so consumers can import everything
// from `@openerp/domain` without reaching into submodules.
export * from "./contracts";
