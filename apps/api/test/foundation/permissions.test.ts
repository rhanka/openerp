import { describe, expect, it } from "vitest";
import { can, denyByDefault, type EffectivePermission } from "../../src/security/permissions";

const grants: EffectivePermission[] = [
  { resource: "admin.user", action: "manage", scope: "organization" },
  { resource: "audit.event", action: "read", scope: "organization" }
];

describe("permission checks", () => {
  it("allows a matching effective permission", () => {
    expect(can(grants, "admin.user", "manage", "organization")).toBe(true);
  });

  it("denies by default when no effective permission matches", () => {
    expect(can(grants, "finance.invoice", "post", "organization")).toBe(false);
    expect(denyByDefault([])).toBe(true);
  });
});
