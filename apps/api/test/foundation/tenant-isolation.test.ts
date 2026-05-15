import { describe, expect, it } from "vitest";

import type { Queryable } from "../../src/db/client";
import {
  TenantScopeViolationError,
  createRowLevelRlsStrategy
} from "../../src/foundation/tenant-isolation";

function makeFakeDb() {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      calls.push({ text, values });
      return { rows: [] };
    }
  };
  return { db, calls };
}

const ORG = "11111111-1111-4111-8111-111111111111";

describe("RowLevelRlsStrategy (PG-03)", () => {
  it("issues set_config with is_local=true on applyScope", async () => {
    const { db, calls } = makeFakeDb();
    const strategy = createRowLevelRlsStrategy(db);
    await strategy.applyScope({
      organizationId: ORG,
      userIdentityId: "uid_1",
      actorType: "human"
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.text).toContain("set_config('app.current_organization_id'");
    expect(calls[0]!.text).toContain("$1, true");
    expect(calls[0]!.values).toEqual([ORG]);
  });

  it("clears the scope on releaseScope", async () => {
    const { db, calls } = makeFakeDb();
    const strategy = createRowLevelRlsStrategy(db);
    await strategy.releaseScope({
      organizationId: ORG,
      userIdentityId: null,
      actorType: "system"
    });
    expect(calls[0]!.text).toContain("set_config('app.current_organization_id', '', false)");
  });

  it("refuses to apply scope when organizationId is not a UUID", async () => {
    const { db } = makeFakeDb();
    const strategy = createRowLevelRlsStrategy(db);
    await expect(
      strategy.applyScope({
        organizationId: "not-a-uuid",
        userIdentityId: null,
        actorType: "system"
      })
    ).rejects.toBeInstanceOf(TenantScopeViolationError);
  });
});
