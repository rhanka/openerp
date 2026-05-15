import { describe, expect, it } from "vitest";

import type { DomainEvent, PayloadSummary } from "@sentropic/openerp-domain";

import type { Queryable } from "../../src/db/client";
import {
  claimUnconsumedEvents,
  findDomainEventById,
  listDomainEvents,
  markEventConsumed,
  publishDomainEvent
} from "../../src/foundation/domain-events";
import { InvalidEntryTypeError } from "../../src/foundation/entry-type-grammar";

function makeFakeDb() {
  const rows: DomainEvent[] = [];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;

      if (t.includes("insert into domain_events")) {
        const [organizationId, eventType, resourceType, resourceId, payloadSummary, emittedAt] =
          values as [string, string, string, string, PayloadSummary, string];
        const row: DomainEvent = {
          id: `evt_${rows.length + 1}`,
          organizationId,
          eventType,
          resourceType,
          resourceId,
          payloadSummary,
          emittedAt,
          consumedAt: null
        };
        rows.push(row);
        return { rows: [row as unknown as T] };
      }

      if (t.includes("from domain_events") && t.includes("where id = $1 and organization_id = $2")
          && !t.includes("update")) {
        const [id, organizationId] = values as [string, string];
        const found = rows.find((r) => r.id === id && r.organizationId === organizationId);
        return { rows: found ? [found as unknown as T] : [] };
      }

      if (t.includes("from domain_events") && t.includes("for update skip locked")) {
        const [organizationId, limit] = values as [string, number];
        const matches = rows
          .filter((r) => r.organizationId === organizationId && r.consumedAt === null)
          .sort((a, b) => (a.emittedAt < b.emittedAt ? -1 : 1))
          .slice(0, limit);
        return { rows: matches as unknown as T[] };
      }

      if (t.includes("update domain_events") && t.includes("set consumed_at = now()")) {
        const [id, organizationId] = values as [string, string];
        const idx = rows.findIndex((r) =>
          r.id === id && r.organizationId === organizationId && r.consumedAt === null);
        if (idx === -1) return { rows: [] };
        rows[idx] = { ...rows[idx]!, consumedAt: "2026-05-14T23:00:00.000Z" };
        return { rows: [rows[idx]! as unknown as T] };
      }

      if (t.includes("from domain_events")) {
        const [organizationId] = values as [string];
        const filtered = rows.filter((r) => r.organizationId === organizationId);
        return { rows: filtered as unknown as T[] };
      }

      return { rows: [] };
    }
  };

  return { db };
}

const context = { organizationId: "org_1", actorUserId: "user_1" };

describe("DomainEvent outbox repo (PG-06 article 2, Lot 3)", () => {
  it("publishes an event with a valid event_type from the grammar", async () => {
    const { db } = makeFakeDb();
    const event = await publishDomainEvent(db, context, {
      eventType: "billing.invoice.issued",
      resourceType: "invoice",
      resourceId: "invoice_1",
      payloadSummary: { totalMinor: 12345, currency: "CAD" }
    });
    expect(event.eventType).toBe("billing.invoice.issued");
    expect(event.consumedAt).toBeNull();
  });

  it("refuses to publish an event whose type breaks the grammar", async () => {
    const { db } = makeFakeDb();
    await expect(
      publishDomainEvent(db, context, {
        eventType: "billing.invoice.frobnicated",
        resourceType: "invoice",
        resourceId: "invoice_1",
        payloadSummary: {}
      })
    ).rejects.toBeInstanceOf(InvalidEntryTypeError);
  });

  it("claims unconsumed events FIFO and marks them consumed", async () => {
    const { db } = makeFakeDb();
    await publishDomainEvent(db, context, {
      eventType: "billing.invoice.issued",
      resourceType: "invoice",
      resourceId: "invoice_1",
      payloadSummary: {},
      emittedAt: "2026-05-14T20:00:00.000Z"
    });
    await publishDomainEvent(db, context, {
      eventType: "billing.payment.registered",
      resourceType: "payment",
      resourceId: "payment_1",
      payloadSummary: {},
      emittedAt: "2026-05-14T21:00:00.000Z"
    });

    const claimed = await claimUnconsumedEvents(db, context, 10);
    expect(claimed).toHaveLength(2);
    expect(claimed[0]!.eventType).toBe("billing.invoice.issued");

    const consumed = await markEventConsumed(db, context, claimed[0]!.id);
    expect(consumed?.consumedAt).not.toBeNull();

    const remaining = await claimUnconsumedEvents(db, context, 10);
    expect(remaining).toHaveLength(1);
    expect(remaining[0]!.eventType).toBe("billing.payment.registered");
  });

  it("findDomainEventById scopes by tenant", async () => {
    const { db } = makeFakeDb();
    const created = await publishDomainEvent(db, context, {
      eventType: "crm.opportunity.won",
      resourceType: "opportunity",
      resourceId: "opp_1",
      payloadSummary: {}
    });
    expect((await findDomainEventById(db, context, created.id))?.id).toBe(created.id);
    expect(await findDomainEventById(db, context, "evt_missing")).toBeNull();
  });

  it("listDomainEvents returns events scoped by tenant", async () => {
    const { db } = makeFakeDb();
    await publishDomainEvent(db, context, {
      eventType: "crm.opportunity.won",
      resourceType: "opportunity",
      resourceId: "opp_1",
      payloadSummary: {}
    });
    const list = await listDomainEvents(db, context);
    expect(list).toHaveLength(1);
  });
});
