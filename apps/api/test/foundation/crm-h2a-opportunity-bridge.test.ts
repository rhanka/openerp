import { describe, expect, it } from "vitest";
import { verifyJournalChain } from "@sentropic/h2a";

import {
  buildOpportunityJournalEntry,
  opportunityActionToEnvelopeType,
  readOpportunityJournalChain,
  type OpportunityJournalBody
} from "../../src/crm/h2a-opportunity-bridge";
import type { Queryable, TenantContext } from "../../src/db/client";

const context: TenantContext = {
  organizationId: "00000000-0000-0000-0000-000000000020",
  actorUserId: "00000000-0000-0000-0000-0000000000cc"
};

function emptyDb(): Queryable {
  return { async query() { return { rows: [] as never }; } };
}

function dbWithLatestEntry(entry: unknown): Queryable {
  return {
    async query() {
      return { rows: [{ entry }] as never };
    }
  };
}

describe("h2a-opportunity-bridge", () => {
  it("maps each opportunity action to the canonical h2a envelope type", () => {
    expect(opportunityActionToEnvelopeType("created")).toBe("propose");
    expect(opportunityActionToEnvelopeType("stage_changed")).toBe("counter");
    expect(opportunityActionToEnvelopeType("won")).toBe("accept");
    expect(opportunityActionToEnvelopeType("lost")).toBe("reject");
    expect(opportunityActionToEnvelopeType("archived")).toBe("withdraw");
  });

  it("creates a sequence-0 journal entry without prevHash when no prior entry exists", async () => {
    const entry = await buildOpportunityJournalEntry(emptyDb(), context, {
      opportunityId: "20000000-0000-0000-0000-000000000001",
      actorInstance: context.actorUserId,
      action: "created",
      body: {
        opportunityId: "20000000-0000-0000-0000-000000000001",
        action: "created",
        status: "open",
        stageId: "ps_1"
      }
    });
    expect(entry.sequence).toBe(0);
    expect(entry.prevHash).toBeUndefined();
    expect(entry.type).toBe("propose");
    expect(entry.artifactKind).toBe("ENGAGEMENT");
    expect(entry.engagementId).toBe("20000000-0000-0000-0000-000000000001");
  });

  it("chains the next entry via prevHash when a previous entry is persisted", async () => {
    const first = await buildOpportunityJournalEntry(emptyDb(), context, {
      opportunityId: "20000000-0000-0000-0000-000000000002",
      actorInstance: context.actorUserId,
      action: "created",
      body: {
        opportunityId: "20000000-0000-0000-0000-000000000002",
        action: "created",
        status: "open",
        stageId: "ps_1"
      }
    });
    const second = await buildOpportunityJournalEntry(dbWithLatestEntry(first), context, {
      opportunityId: "20000000-0000-0000-0000-000000000002",
      actorInstance: context.actorUserId,
      action: "stage_changed",
      body: {
        opportunityId: "20000000-0000-0000-0000-000000000002",
        action: "stage_changed",
        status: "open",
        stageId: "ps_2",
        fromStageId: "ps_1"
      }
    });
    expect(second.sequence).toBe(1);
    expect(second.prevHash).toBe(first.contentHash);
    expect(second.type).toBe("counter");
    expect(verifyJournalChain([first, second]).ok).toBe(true);
  });

  it("readOpportunityJournalChain returns rows in sequence order", async () => {
    const db: Queryable = {
      async query() {
        return {
          rows: [
            {
              entry: {
                protocol: "sentropic.h2a",
                version: "0.1",
                id: "e1",
                type: "propose",
                actor: { instance: "u", role: "PRINCIPAL", scope: "org:o" },
                body: {
                  opportunityId: "r",
                  action: "created",
                  status: "open",
                  stageId: "s"
                } as OpportunityJournalBody,
                createdAt: "2026-05-23T08:00:00.000Z",
                sequence: 0,
                contentHash: "h0"
              }
            }
          ] as never
        };
      }
    };
    const out = await readOpportunityJournalChain(db, context, "r");
    expect(out).toHaveLength(1);
    expect(out[0]!.sequence).toBe(0);
  });
});
