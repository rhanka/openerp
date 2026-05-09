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
