import { describe, expect, it } from "vitest";

import type { PayloadSummary, TimelineEntry } from "@openerp/domain";

import type { Queryable } from "../../src/db/client";
import { InvalidEntryTypeError } from "../../src/foundation/entry-type-grammar";
import {
  insertTimelineEntry,
  listTimelineEntriesForResource
} from "../../src/foundation/timeline-entries";

function makeFakeDb() {
  const rows: TimelineEntry[] = [];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;
      if (t.includes("insert into timeline_entries")) {
        const [organizationId, resourceType, resourceId, actorUserIdentityId, entryType,
               payloadSummary, occurredAt] = values as [
          string, string, string, string | null, string, PayloadSummary, string
        ];
        const row: TimelineEntry = {
          id: `tl_${rows.length + 1}`,
          organizationId,
          resourceType,
          resourceId,
          actorUserIdentityId,
          entryType,
          payloadSummary,
          occurredAt
        };
        rows.push(row);
        return { rows: [row as unknown as T] };
      }
      if (t.includes("from timeline_entries")) {
        const [organizationId, resourceType, resourceId] = values as [string, string, string];
        const limit = values[values.length - 1] as number;
        const matches = rows.filter((r) =>
          r.organizationId === organizationId
          && r.resourceType === resourceType
          && r.resourceId === resourceId);
        matches.sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
        return { rows: matches.slice(0, limit) as unknown as T[] };
      }
      return { rows: [] };
    }
  };
  return { db };
}

const context = { organizationId: "org_1", actorUserId: "user_1" };

describe("TimelineEntry repository (PG-06 article 2)", () => {
  it("inserts a timeline entry with a valid entry_type", async () => {
    const { db } = makeFakeDb();
    const row = await insertTimelineEntry(db, context, {
      resourceType: "opportunity",
      resourceId: "opp_1",
      actorUserIdentityId: "uid_human",
      entryType: "crm.opportunity.stage_changed",
      payloadSummary: { from: "discovery", to: "proposal" }
    });
    expect(row.entryType).toBe("crm.opportunity.stage_changed");
    expect(row.resourceId).toBe("opp_1");
  });

  it("refuses an invalid entry_type via the grammar guard", async () => {
    const { db } = makeFakeDb();
    await expect(
      insertTimelineEntry(db, context, {
        resourceType: "opportunity",
        resourceId: "opp_1",
        actorUserIdentityId: "uid_human",
        entryType: "crm.opportunity.frobnicated",
        payloadSummary: {}
      })
    ).rejects.toBeInstanceOf(InvalidEntryTypeError);
  });

  it("lists entries for a resource scoped to the tenant", async () => {
    const { db } = makeFakeDb();
    await insertTimelineEntry(db, context, {
      resourceType: "opportunity",
      resourceId: "opp_1",
      actorUserIdentityId: "uid_human",
      entryType: "crm.opportunity.created",
      payloadSummary: {},
      occurredAt: "2026-05-01T00:00:00.000Z"
    });
    await insertTimelineEntry(db, context, {
      resourceType: "opportunity",
      resourceId: "opp_1",
      actorUserIdentityId: "uid_human",
      entryType: "crm.opportunity.stage_changed",
      payloadSummary: { from: "discovery", to: "proposal" },
      occurredAt: "2026-05-10T00:00:00.000Z"
    });
    const list = await listTimelineEntriesForResource(db, context, {
      resourceType: "opportunity",
      resourceId: "opp_1"
    });
    expect(list).toHaveLength(2);
    expect(list[0]!.entryType).toBe("crm.opportunity.stage_changed");
  });
});
