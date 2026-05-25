import { describe, expect, it } from "vitest";

import type { Rate } from "@sentropic/openerp-domain/project";

import type { Queryable } from "../../src/db/client";
import {
  RateNotFoundError,
  createRate,
  deleteRate,
  listRates,
  updateRate
} from "../../src/project/rate-service";

const DEMO_MONEY = { amountMinor: 15000, currency: "CAD", scale: 2 };

interface AuditRow {
  organizationId: string;
  actorUserId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  beforeSummary: unknown;
  afterSummary: unknown;
}

function makeFakeDb() {
  const rates: Rate[] = [];
  const audits: AuditRow[] = [];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;

      if (t.includes("insert into rates")) {
        const [organizationId, name, amountJson, effectiveFrom, effectiveTo, active] = values as [
          string,
          string,
          string,
          string,
          string | null,
          boolean
        ];
        const row: Rate = {
          id: `rate_${rates.length + 1}`,
          organizationId,
          name,
          amount: JSON.parse(String(amountJson)),
          effectiveFrom,
          effectiveTo,
          active,
          createdAt: "2026-05-25T08:00:00.000Z",
          updatedAt: "2026-05-25T08:00:00.000Z"
        };
        rates.push(row);
        return { rows: [row as unknown as T] };
      }

      if (t.includes("from rates") && t.includes("where id = $1")) {
        const [id, organizationId] = values as [string, string];
        const found = rates.find(
          (r) =>
            r.id === id &&
            r.organizationId === organizationId &&
            !(r as unknown as { _deleted?: boolean })._deleted
        );
        return { rows: found ? [found as unknown as T] : [] };
      }

      if (t.includes("from rates") && t.includes("order by name asc")) {
        const [organizationId, activeFilter, limit, offset] = values as [
          string,
          boolean,
          number,
          number
        ];
        const filtered = rates
          .filter((r) => r.organizationId === organizationId)
          .filter((r) => !(r as unknown as { _deleted?: boolean })._deleted)
          .filter((r) => (!activeFilter ? true : r.active))
          .slice(offset, offset + limit);
        return { rows: filtered as unknown as T[] };
      }

      if (t.includes("update rates") && t.includes("deleted_at = now()")) {
        const [id, organizationId] = values as [string, string];
        const idx = rates.findIndex(
          (r) =>
            r.id === id &&
            r.organizationId === organizationId &&
            !(r as unknown as { _deleted?: boolean })._deleted
        );
        if (idx === -1) return { rows: [] };
        (rates[idx] as unknown as { _deleted: boolean })._deleted = true;
        return { rows: [{ id: rates[idx]!.id } as unknown as T] };
      }

      if (t.includes("update rates")) {
        const [id, organizationId] = values as [string, string];
        const idx = rates.findIndex(
          (r) => r.id === id && r.organizationId === organizationId
        );
        if (idx === -1) return { rows: [] };
        const trailing = values.slice(2);
        const patch: Partial<Rate> = {};
        if (t.includes("name = $")) {
          const nameVal = trailing.find((v) => typeof v === "string" && v.length > 0);
          if (nameVal !== undefined) patch.name = String(nameVal);
        }
        if (t.includes("active = $")) {
          const activeVal = trailing.find((v) => typeof v === "boolean");
          if (activeVal !== undefined) patch.active = activeVal as boolean;
        }
        rates[idx] = { ...rates[idx]!, ...patch, updatedAt: "2026-05-25T08:05:00.000Z" };
        return { rows: [rates[idx]! as unknown as T] };
      }

      if (t.includes("insert into audit_events")) {
        const [
          organizationId,
          actorUserId,
          _actorType,
          action,
          resourceType,
          resourceId,
          beforeSummary,
          afterSummary
        ] = values as [string, string, string, string, string, string, unknown, unknown];
        void _actorType;
        audits.push({
          organizationId,
          actorUserId,
          action,
          resourceType,
          resourceId,
          beforeSummary,
          afterSummary
        });
        return { rows: [] };
      }

      if (t.includes("insert into timeline_entries")) {
        return { rows: [] };
      }

      return { rows: [] };
    }
  };

  return { db, rates, audits };
}

const context = { organizationId: "org_1", actorUserId: "user_actor" };

describe("RateService (DS 3.3)", () => {
  it("creates a rate and emits project.rate.created", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createRate(db, context, {
      name: "Senior consultant",
      amount: DEMO_MONEY,
      effectiveFrom: "2026-01-01"
    });
    expect(created.name).toBe("Senior consultant");
    expect(created.active).toBe(true);
    expect(created.amount).toMatchObject(DEMO_MONEY);
    const createAudit = audits.find((a) => a.action === "project.rate.created");
    expect(createAudit).toBeDefined();
    expect(createAudit!.resourceType).toBe("rate");
    expect(createAudit!.resourceId).toBe(created.id);
  });

  it("updates a rate and emits project.rate.updated with before/after", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createRate(db, context, {
      name: "Junior developer",
      amount: DEMO_MONEY,
      effectiveFrom: "2026-01-01"
    });
    const updated = await updateRate(db, context, created.id, { active: false });
    expect(updated.active).toBe(false);
    const updateAudit = audits.find((a) => a.action === "project.rate.updated");
    expect(updateAudit).toBeDefined();
    expect(updateAudit!.beforeSummary).toMatchObject({ active: true });
    expect(updateAudit!.afterSummary).toMatchObject({ active: false });
  });

  it("throws RateNotFoundError on missing id", async () => {
    const { db } = makeFakeDb();
    await expect(
      updateRate(db, context, "rate_nope", { name: "X" })
    ).rejects.toBeInstanceOf(RateNotFoundError);
  });

  it("lists rates with activeOnly filter", async () => {
    const { db } = makeFakeDb();
    await createRate(db, context, { name: "Active rate", amount: DEMO_MONEY, effectiveFrom: "2026-01-01", active: true });
    await createRate(db, context, { name: "Inactive rate", amount: DEMO_MONEY, effectiveFrom: "2026-01-01", active: false });
    const all = await listRates(db, context);
    expect(all.length).toBe(2);
    const active = await listRates(db, context, { activeOnly: true });
    expect(active.map((r) => r.name)).toEqual(["Active rate"]);
  });

  it("soft-deletes a rate: emits project.rate.deleted and hides it from default reads", async () => {
    const { db, audits } = makeFakeDb();
    const created = await createRate(db, context, {
      name: "To be deleted",
      amount: DEMO_MONEY,
      effectiveFrom: "2026-01-01"
    });
    await deleteRate(db, context, created.id);
    const deleteAudit = audits.find((a) => a.action === "project.rate.deleted");
    expect(deleteAudit).toBeDefined();
    expect(deleteAudit!.resourceId).toBe(created.id);
    expect(deleteAudit!.beforeSummary).toMatchObject({ name: "To be deleted" });
    const list = await listRates(db, context);
    expect(list.find((r) => r.id === created.id)).toBeUndefined();
  });

  it("throws RateNotFoundError when deleting a non-existent rate", async () => {
    const { db } = makeFakeDb();
    await expect(deleteRate(db, context, "rate_nope")).rejects.toBeInstanceOf(RateNotFoundError);
  });
});
