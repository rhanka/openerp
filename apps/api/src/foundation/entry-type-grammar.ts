// Entry / event type grammar validator (PG-06 article 2 + D-CRM-05 promu transverse).
// Format: `<module>.<entity>.<verb>` (3 dot-separated segments), each segment
// snake_case (lowercase letters, digits, underscores, no leading digit).
//
// Modules are bounded to the MVP module catalog; verbs are bounded to a known
// vocabulary so reporting/automation can switch on them safely.

const SEGMENT_REGEX = /^[a-z][a-z0-9_]*$/;

export const ALLOWED_MODULES = new Set([
  "foundation",
  "crm",
  "project",
  "billing",
  "reporting",
  "workflow",
  "agentic",
  "system"
] as const);

export type AllowedModule = typeof ALLOWED_MODULES extends Set<infer M> ? M : never;

// Verbs deliberately kept small — extend with discipline. Reporting/automation
// uses these to build typed triggers.
export const ALLOWED_VERBS = new Set([
  "created",
  "updated",
  "deleted",
  "stage_changed",
  "status_changed",
  "submitted",
  "approved",
  "rejected",
  "requested",
  "accepted",
  "decided",
  "escalated",
  "expired",
  "won",
  "lost",
  "issued",
  "void",
  "written_off",
  "paid",
  "partially_paid",
  "overdue",
  "registered",
  "imported",
  "exported",
  "scheduled",
  "started",
  "succeeded",
  "failed",
  "cancelled",
  "skipped",
  "tracked",
  "noted",
  "commented",
  "assigned",
  "unassigned",
  "completed",
  "converted",
  "disqualified",
  "posted",
  "voided"
] as const);

export class InvalidEntryTypeError extends Error {
  readonly code = "INVALID_ENTRY_TYPE";
  constructor(entryType: string, reason: string) {
    super(`Invalid entry_type '${entryType}': ${reason}`);
  }
}

export interface ParsedEntryType {
  module: string;
  entity: string;
  verb: string;
}

export function parseEntryType(entryType: string): ParsedEntryType {
  const parts = entryType.split(".");
  if (parts.length !== 3) {
    throw new InvalidEntryTypeError(entryType, "must have 3 segments separated by '.'");
  }
  const [moduleRaw, entityRaw, verbRaw] = parts as [string, string, string];
  for (const [seg, name] of [
    [moduleRaw, "module"],
    [entityRaw, "entity"],
    [verbRaw, "verb"]
  ] as const) {
    if (!SEGMENT_REGEX.test(seg)) {
      throw new InvalidEntryTypeError(entryType, `${name} must match /^[a-z][a-z0-9_]*$/`);
    }
  }
  if (!ALLOWED_MODULES.has(moduleRaw as AllowedModule)) {
    throw new InvalidEntryTypeError(
      entryType,
      `module '${moduleRaw}' is not in the allowed module catalog`
    );
  }
  if (!ALLOWED_VERBS.has(verbRaw as never)) {
    throw new InvalidEntryTypeError(
      entryType,
      `verb '${verbRaw}' is not in the allowed verb catalog (extend ALLOWED_VERBS deliberately)`
    );
  }
  return { module: moduleRaw, entity: entityRaw, verb: verbRaw };
}

export function assertEntryType(entryType: string): void {
  parseEntryType(entryType);
}

export function isValidEntryType(entryType: string): boolean {
  try {
    parseEntryType(entryType);
    return true;
  } catch {
    return false;
  }
}
