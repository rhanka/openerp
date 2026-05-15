import { describe, expect, it } from "vitest";
import type { OrganizationMember } from "@openerp/domain";
import type { Queryable } from "../../src/db/client";
import {
  findOrganizationMember,
  insertOrganizationMember,
  listOrganizationMembersByOrganization,
  listOrganizationMembersByUserIdentity,
  setOrganizationMemberStatus
} from "../../src/foundation/organization-members";

function makeFakeDb() {
  const rows: OrganizationMember[] = [];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;

      if (t.includes("insert into organization_members")) {
        const [userIdentityId, organizationId, status, preferredLocale] = values as [
          string, string, "invited" | "active" | "deactivated", "en" | "fr" | null
        ];
        const row: OrganizationMember = {
          id: `om_${rows.length + 1}`,
          userIdentityId,
          organizationId,
          status,
          preferredLocale,
          joinedAt: "2026-05-14T12:00:00.000Z",
          updatedAt: "2026-05-14T12:00:00.000Z"
        };
        rows.push(row);
        return { rows: [row as unknown as T] };
      }

      if (t.includes("from organization_members") && t.includes("organization_id = $1 and user_identity_id = $2")) {
        const [organizationId, userIdentityId] = values as [string, string];
        const found = rows.find((r) => r.organizationId === organizationId && r.userIdentityId === userIdentityId);
        return { rows: found ? [found as unknown as T] : [] };
      }

      if (t.includes("from organization_members") && t.includes("where organization_id = $1\n      order by joined_at desc")) {
        const [organizationId] = values as [string];
        const matches = rows.filter((r) => r.organizationId === organizationId);
        return { rows: matches as unknown as T[] };
      }

      if (t.includes("from organization_members") && t.includes("where user_identity_id = $1")) {
        const [userIdentityId] = values as [string];
        const matches = rows.filter((r) => r.userIdentityId === userIdentityId);
        return { rows: matches as unknown as T[] };
      }

      if (t.includes("update organization_members") && t.includes("set status")) {
        const [memberId, organizationId, status] = values as [
          string, string, "invited" | "active" | "deactivated"
        ];
        const idx = rows.findIndex((r) => r.id === memberId && r.organizationId === organizationId);
        if (idx === -1) return { rows: [] };
        rows[idx] = { ...rows[idx]!, status };
        return { rows: [rows[idx]! as unknown as T] };
      }

      return { rows: [] };
    }
  };

  return { db };
}

const context = { organizationId: "org_1", actorUserId: "user_1" };
const contextOther = { organizationId: "org_2", actorUserId: "user_2" };

describe("OrganizationMember repository (PG-02, tenant-scoped)", () => {
  it("inserts a member scoped to the current organization", async () => {
    const { db } = makeFakeDb();
    const member = await insertOrganizationMember(db, context, {
      userIdentityId: "uid_1",
      status: "active",
      preferredLocale: "fr"
    });
    expect(member.organizationId).toBe("org_1");
    expect(member.userIdentityId).toBe("uid_1");
  });

  it("finds a member within the current org and not in another", async () => {
    const { db } = makeFakeDb();
    await insertOrganizationMember(db, context, {
      userIdentityId: "uid_1",
      status: "active",
      preferredLocale: null
    });
    expect((await findOrganizationMember(db, context, "uid_1"))?.userIdentityId).toBe("uid_1");
    expect(await findOrganizationMember(db, contextOther, "uid_1")).toBeNull();
  });

  it("lists members of the current org only", async () => {
    const { db } = makeFakeDb();
    await insertOrganizationMember(db, context, {
      userIdentityId: "uid_1",
      status: "active",
      preferredLocale: null
    });
    await insertOrganizationMember(db, contextOther, {
      userIdentityId: "uid_1",
      status: "active",
      preferredLocale: null
    });
    const inOrg1 = await listOrganizationMembersByOrganization(db, context);
    expect(inOrg1).toHaveLength(1);
    expect(inOrg1[0]!.organizationId).toBe("org_1");
  });

  it("lists every org membership for a user identity (cross-org)", async () => {
    const { db } = makeFakeDb();
    await insertOrganizationMember(db, context, {
      userIdentityId: "uid_1",
      status: "active",
      preferredLocale: null
    });
    await insertOrganizationMember(db, contextOther, {
      userIdentityId: "uid_1",
      status: "active",
      preferredLocale: null
    });
    const memberships = await listOrganizationMembersByUserIdentity(db, "uid_1");
    expect(memberships).toHaveLength(2);
  });

  it("transitions member status scoped to org", async () => {
    const { db } = makeFakeDb();
    const inserted = await insertOrganizationMember(db, context, {
      userIdentityId: "uid_1",
      status: "invited",
      preferredLocale: null
    });
    const updated = await setOrganizationMemberStatus(db, context, inserted.id, "active");
    expect(updated?.status).toBe("active");
    expect(await setOrganizationMemberStatus(db, contextOther, inserted.id, "deactivated")).toBeNull();
  });
});
