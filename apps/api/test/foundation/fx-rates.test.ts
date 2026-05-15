import { describe, expect, it } from "vitest";
import type { FxRateSnapshot } from "@openerp/domain";
import type { Queryable } from "../../src/db/client";
import {
  findFxRateAt,
  insertFxRateSnapshot,
  listFxRatesForOrganization
} from "../../src/foundation/fx-rates";

function makeFakeDb() {
  const rows: FxRateSnapshot[] = [];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;

      if (t.includes("insert into fx_rate_snapshots")) {
        const [organizationId, sourceCurrency, targetCurrency, rate, effectiveAt, source] =
          values as [string, string, string, string, string, string];
        const row: FxRateSnapshot = {
          id: `fx_${rows.length + 1}`,
          organizationId,
          sourceCurrency,
          targetCurrency,
          rate,
          effectiveAt,
          source
        };
        rows.push(row);
        return { rows: [row as unknown as T] };
      }

      if (t.includes("from fx_rate_snapshots") && t.includes("limit 1")) {
        const [organizationId, sourceCurrency, targetCurrency, effectiveAt] = values as [
          string, string, string, string
        ];
        const candidates = rows.filter((r) =>
          r.organizationId === organizationId
          && r.sourceCurrency === sourceCurrency
          && r.targetCurrency === targetCurrency
          && r.effectiveAt <= effectiveAt
        );
        candidates.sort((a, b) => (a.effectiveAt < b.effectiveAt ? 1 : -1));
        return { rows: candidates.length ? [candidates[0] as unknown as T] : [] };
      }

      if (t.includes("from fx_rate_snapshots") && t.includes("order by effective_at desc")) {
        // listFxRatesForOrganization: dynamic filters in $2..$n, limit last.
        const limit = values[values.length - 1] as number;
        const organizationId = values[0] as string;
        const filtered = rows.filter((r) => r.organizationId === organizationId);
        const sorted = filtered.sort((a, b) => (a.effectiveAt < b.effectiveAt ? 1 : -1));
        return { rows: sorted.slice(0, limit) as unknown as T[] };
      }

      return { rows: [] };
    }
  };

  return { db };
}

const context = { organizationId: "org_1", actorUserId: "user_1" };

describe("FxRateSnapshot repository (PG-06 article 1)", () => {
  it("inserts a snapshot scoped to the org", async () => {
    const { db } = makeFakeDb();
    const snap = await insertFxRateSnapshot(db, context, {
      sourceCurrency: "USD",
      targetCurrency: "CAD",
      rate: "1.3625",
      effectiveAt: "2026-05-14T00:00:00.000Z",
      source: "boc"
    });
    expect(snap.rate).toBe("1.3625");
    expect(snap.organizationId).toBe("org_1");
  });

  it("validates currency codes and rates", async () => {
    const { db } = makeFakeDb();
    await expect(
      insertFxRateSnapshot(db, context, {
        sourceCurrency: "us",
        targetCurrency: "CAD",
        rate: "1",
        effectiveAt: "2026-05-14T00:00:00.000Z",
        source: "boc"
      })
    ).rejects.toThrow(/sourceCurrency/);

    await expect(
      insertFxRateSnapshot(db, context, {
        sourceCurrency: "USD",
        targetCurrency: "CAD",
        rate: "-1",
        effectiveAt: "2026-05-14T00:00:00.000Z",
        source: "boc"
      })
    ).rejects.toThrow(/positive/);
  });

  it("finds the most recent snapshot at or before the requested moment", async () => {
    const { db } = makeFakeDb();
    await insertFxRateSnapshot(db, context, {
      sourceCurrency: "USD", targetCurrency: "CAD", rate: "1.30",
      effectiveAt: "2026-05-01T00:00:00.000Z", source: "boc"
    });
    await insertFxRateSnapshot(db, context, {
      sourceCurrency: "USD", targetCurrency: "CAD", rate: "1.35",
      effectiveAt: "2026-05-10T00:00:00.000Z", source: "boc"
    });
    const found = await findFxRateAt(db, context, {
      sourceCurrency: "USD", targetCurrency: "CAD",
      effectiveAt: "2026-05-12T00:00:00.000Z"
    });
    expect(found?.rate).toBe("1.35");
  });

  it("returns null when no snapshot exists at or before the moment", async () => {
    const { db } = makeFakeDb();
    await insertFxRateSnapshot(db, context, {
      sourceCurrency: "USD", targetCurrency: "CAD", rate: "1.30",
      effectiveAt: "2026-05-10T00:00:00.000Z", source: "boc"
    });
    const found = await findFxRateAt(db, context, {
      sourceCurrency: "USD", targetCurrency: "CAD",
      effectiveAt: "2026-05-01T00:00:00.000Z"
    });
    expect(found).toBeNull();
  });

  it("lists rates for the org, respecting limit", async () => {
    const { db } = makeFakeDb();
    for (let i = 0; i < 5; i++) {
      await insertFxRateSnapshot(db, context, {
        sourceCurrency: "USD", targetCurrency: "CAD", rate: `1.${10 + i}`,
        effectiveAt: `2026-05-0${i + 1}T00:00:00.000Z`, source: "boc"
      });
    }
    const all = await listFxRatesForOrganization(db, context, { limit: 3 });
    expect(all).toHaveLength(3);
  });
});
