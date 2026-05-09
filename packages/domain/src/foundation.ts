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
