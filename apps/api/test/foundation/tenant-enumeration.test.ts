import { describe, expect, it, vi } from "vitest";

import type { Queryable } from "../../src/db/client";
import { listActiveOrganizationIds } from "../../src/foundation/tenant-enumeration";

function makeDb(rows: Array<{ id: string }>): Queryable {
  return {
    query: vi.fn().mockResolvedValue({ rows })
  };
}

describe("listActiveOrganizationIds", () => {
  it("returns an empty array when no organizations exist", async () => {
    const db = makeDb([]);
    const result = await listActiveOrganizationIds(db);
    expect(result).toEqual([]);
  });

  it("returns ids in the order returned by the query", async () => {
    const rows = [
      { id: "11111111-1111-4111-8111-111111111111" },
      { id: "22222222-2222-4222-8222-222222222222" },
      { id: "33333333-3333-4333-8333-333333333333" }
    ];
    const db = makeDb(rows);
    const result = await listActiveOrganizationIds(db);
    expect(result).toEqual([
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
      "33333333-3333-4333-8333-333333333333"
    ]);
  });

  it("issues SQL with where deleted_at is null and order by created_at asc", async () => {
    const db = makeDb([]);
    await listActiveOrganizationIds(db);
    const querySpy = db.query as ReturnType<typeof vi.fn>;
    expect(querySpy).toHaveBeenCalledOnce();
    const sql: string = querySpy.mock.calls[0]![0];
    expect(sql).toContain("where deleted_at is null");
    expect(sql).toContain("order by created_at asc");
  });
});
