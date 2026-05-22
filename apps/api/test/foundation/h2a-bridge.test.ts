import { describe, expect, it } from "vitest";
import { verifyJournalChain } from "@sentropic/h2a";

import {
  approvalActionToEnvelopeType,
  buildApprovalJournalEntry,
  findPreviousJournalEntry,
  readApprovalJournalChain,
  type ApprovalJournalBody
} from "../../src/foundation/h2a-bridge";
import type { Queryable, TenantContext } from "../../src/db/client";

const context: TenantContext = {
  organizationId: "00000000-0000-0000-0000-000000000001",
  actorUserId: "00000000-0000-0000-0000-0000000000aa"
};

function makeQueryableStub(rows: Array<{ entry: unknown }> = []): Queryable {
  return {
    async query() {
      return { rows: rows as never };
    }
  };
}

describe("h2a-bridge — ApprovalRequest -> H2A envelope mapping", () => {
  it("maps each approval action to the canonical h2a envelope type", () => {
    expect(approvalActionToEnvelopeType("created")).toBe("propose");
    expect(approvalActionToEnvelopeType("approved")).toBe("accept");
    expect(approvalActionToEnvelopeType("rejected")).toBe("reject");
    expect(approvalActionToEnvelopeType("escalated")).toBe("escalate");
    expect(approvalActionToEnvelopeType("expired")).toBe("event");
  });

  it("creates a sequence-1 journal entry without prevHash when no prior entry exists", async () => {
    const db = makeQueryableStub();
    const entry = await buildApprovalJournalEntry(db, context, {
      approvalRequestId: "10000000-0000-0000-0000-000000000001",
      actorInstance: context.actorUserId,
      action: "created",
      body: {
        approvalRequestId: "10000000-0000-0000-0000-000000000001",
        action: "created",
        status: "pending"
      }
    });
    expect(entry.sequence).toBe(0);
    expect(entry.prevHash).toBeUndefined();
    expect(entry.contentHash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(entry.type).toBe("propose");
    expect(entry.artifactKind).toBe("ENGAGEMENT");
  });

  it("chains the next journal entry via prevHash referencing the latest persisted entry", async () => {
    const firstEntry = await buildApprovalJournalEntry(makeQueryableStub(), context, {
      approvalRequestId: "10000000-0000-0000-0000-000000000002",
      actorInstance: context.actorUserId,
      action: "created",
      body: {
        approvalRequestId: "10000000-0000-0000-0000-000000000002",
        action: "created",
        status: "pending"
      }
    });

    const db = makeQueryableStub([{ entry: firstEntry }]);
    const secondEntry = await buildApprovalJournalEntry(db, context, {
      approvalRequestId: "10000000-0000-0000-0000-000000000002",
      actorInstance: context.actorUserId,
      action: "approved",
      body: {
        approvalRequestId: "10000000-0000-0000-0000-000000000002",
        action: "approved",
        status: "approved"
      }
    });

    expect(secondEntry.sequence).toBe(1);
    expect(secondEntry.prevHash).toBe(firstEntry.contentHash);
    expect(secondEntry.type).toBe("accept");

    const verification = verifyJournalChain([firstEntry, secondEntry]);
    expect(verification.ok).toBe(true);
  });

  it("findPreviousJournalEntry returns null when audit_events has no journalEntry for this approval", async () => {
    const db = makeQueryableStub();
    const result = await findPreviousJournalEntry(db, context, "10000000-0000-0000-0000-000000000003");
    expect(result).toBeNull();
  });

  it("readApprovalJournalChain returns rows in creation order", async () => {
    const db: Queryable = {
      async query() {
        return {
          rows: [
            {
              entry: {
                protocol: "sentropic.h2a",
                version: "0.1",
                id: "a",
                type: "propose",
                actor: { instance: "u", role: "PRINCIPAL", scope: "org:o" },
                body: { approvalRequestId: "r", action: "created", status: "pending" } as ApprovalJournalBody,
                createdAt: "2026-05-21T00:00:00.000Z",
                sequence: 0,
                contentHash: "h1"
              }
            }
          ] as never
        };
      }
    };
    const out = await readApprovalJournalChain(db, context, "r");
    expect(out).toHaveLength(1);
    expect(out[0]!.sequence).toBe(0);
  });
});
