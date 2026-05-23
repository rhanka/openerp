import { describe, expect, it, vi } from "vitest";

import { recordAuditEvent } from "../../src/foundation/audit-emit";
import type { Queryable, TenantContext } from "../../src/db/client";

const context: TenantContext = {
  organizationId: "00000000-0000-0000-0000-000000000001",
  actorUserId: "00000000-0000-0000-0000-0000000000aa"
};

function spyQueryable() {
  const query = vi.fn(async () => ({ rows: [] as never[] }));
  const db: Queryable = { query };
  return { db, query };
}

describe("recordAuditEvent (foundation audit-emit helper)", () => {
  it("inserts the 8 always-set columns with default actor_type='user' when no optional fields", async () => {
    const { db, query } = spyQueryable();
    await recordAuditEvent(db, context, {
      action: "crm.company.created",
      resourceType: "company",
      resourceId: "co_1",
      afterSummary: { displayName: "Acme" }
    });
    expect(query).toHaveBeenCalledTimes(1);
    const [sql, values] = query.mock.calls[0]! as unknown as [string, unknown[]];
    expect(sql).toMatch(/insert into audit_events \(/i);
    expect(sql).toMatch(/organization_id, actor_user_id, actor_type, action, resource_type, resource_id, before_summary, after_summary/);
    expect(sql).toMatch(/\$1, \$2, \$3, \$4, \$5, \$6, \$7, \$8\)/);
    expect(values).toEqual([
      context.organizationId,
      context.actorUserId,
      "user",
      "crm.company.created",
      "company",
      "co_1",
      null,
      { displayName: "Acme" }
    ]);
  });

  it("appends optional canon columns only when non-null values are provided", async () => {
    const { db, query } = spyQueryable();
    await recordAuditEvent(db, context, {
      action: "approval_request.created",
      resourceType: "approval_request",
      resourceId: "appr_1",
      afterSummary: { status: "pending" },
      correlationId: "11111111-1111-1111-1111-111111111111",
      approvalRequestId: "appr_1"
    });
    const [sql, values] = query.mock.calls[0]! as unknown as [string, unknown[]];
    expect(sql).toContain("correlation_id");
    expect(sql).toContain("approval_request_id");
    expect(sql).not.toContain("agent_id");
    expect(values).toHaveLength(10);
    expect(values[8]).toBe("11111111-1111-1111-1111-111111111111");
    expect(values[9]).toBe("appr_1");
  });

  it("honors a custom actorType (agent flow)", async () => {
    const { db, query } = spyQueryable();
    await recordAuditEvent(db, context, {
      action: "crm.company.updated",
      resourceType: "company",
      resourceId: "co_2",
      actorType: "agent",
      agentId: "22222222-2222-2222-2222-222222222222"
    });
    const [, values] = query.mock.calls[0]! as unknown as [string, unknown[]];
    expect(values[2]).toBe("agent");
    expect(values).toContain("22222222-2222-2222-2222-222222222222");
  });

  it("skips columns where the optional value is explicitly null", async () => {
    const { db, query } = spyQueryable();
    await recordAuditEvent(db, context, {
      action: "crm.company.created",
      resourceType: "company",
      resourceId: "co_3",
      correlationId: null,
      approvalRequestId: null
    });
    const [sql, values] = query.mock.calls[0]! as unknown as [string, unknown[]];
    expect(sql).not.toContain("correlation_id");
    expect(sql).not.toContain("approval_request_id");
    expect(values).toHaveLength(8);
  });
});
