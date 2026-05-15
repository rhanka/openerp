import { describe, expect, it } from "vitest";

import {
  ALLOWED_MODULES,
  ALLOWED_VERBS,
  InvalidEntryTypeError,
  isValidEntryType,
  parseEntryType
} from "../../src/foundation/entry-type-grammar";

describe("entry-type grammar (PG-06 article 2)", () => {
  it("accepts a well-formed entry_type from the allowed catalog", () => {
    const parsed = parseEntryType("crm.opportunity.stage_changed");
    expect(parsed).toEqual({ module: "crm", entity: "opportunity", verb: "stage_changed" });
  });

  it("rejects entry_type with wrong segment count", () => {
    expect(() => parseEntryType("crm.opportunity")).toThrow(InvalidEntryTypeError);
    expect(() => parseEntryType("crm.opportunity.stage_changed.extra")).toThrow(InvalidEntryTypeError);
  });

  it("rejects entry_type with invalid segment chars (uppercase / hyphen / leading digit)", () => {
    expect(() => parseEntryType("CRM.opportunity.created")).toThrow(InvalidEntryTypeError);
    expect(() => parseEntryType("crm.opportunity.stage-changed")).toThrow(InvalidEntryTypeError);
    expect(() => parseEntryType("crm.opportunity.1created")).toThrow(InvalidEntryTypeError);
  });

  it("rejects unknown modules", () => {
    expect(() => parseEntryType("unknown_module.opportunity.created")).toThrow(/module/);
  });

  it("rejects unknown verbs", () => {
    expect(() => parseEntryType("crm.opportunity.frobnicated")).toThrow(/verb/);
  });

  it("isValidEntryType is the boolean form of parseEntryType", () => {
    expect(isValidEntryType("billing.invoice.issued")).toBe(true);
    expect(isValidEntryType("billing.invoice.frobnicated")).toBe(false);
  });

  it("exposes a small explicit module + verb catalog", () => {
    expect(ALLOWED_MODULES.has("foundation")).toBe(true);
    expect(ALLOWED_MODULES.has("crm")).toBe(true);
    expect(ALLOWED_MODULES.has("agentic")).toBe(true);
    expect(ALLOWED_VERBS.has("issued")).toBe(true);
    expect(ALLOWED_VERBS.has("approved")).toBe(true);
    expect(ALLOWED_VERBS.has("stage_changed")).toBe(true);
  });
});
