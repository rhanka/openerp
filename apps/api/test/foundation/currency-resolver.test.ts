import { describe, expect, it } from "vitest";
import { makeMoney } from "@openerp/domain";
import type { Queryable } from "../../src/db/client";
import { createCurrencyResolver } from "../../src/foundation/currency-resolver";
import { insertFxRateSnapshot } from "../../src/foundation/fx-rates";

function makeFakeDb() {
  type Row = {
    id: string;
    organizationId: string;
    sourceCurrency: string;
    targetCurrency: string;
    rate: string;
    effectiveAt: string;
    source: string;
  };
  const rows: Row[] = [];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;
      if (t.includes("insert into fx_rate_snapshots")) {
        const [organizationId, sourceCurrency, targetCurrency, rate, effectiveAt, source] =
          values as [string, string, string, string, string, string];
        const row: Row = {
          id: `fx_${rows.length + 1}`,
          organizationId, sourceCurrency, targetCurrency, rate, effectiveAt, source
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
      return { rows: [] };
    }
  };

  return { db };
}

const context = { organizationId: "org_1", actorUserId: "user_1" };

describe("CurrencyResolver (PG-06 article 1)", () => {
  it("returns an identity rate when source and target currencies match", async () => {
    const { db } = makeFakeDb();
    const resolver = createCurrencyResolver(db, context);
    const snapshot = await resolver.resolve("usd", "USD", "2026-05-14T00:00:00.000Z");
    expect(snapshot.rate).toBe("1");
    expect(snapshot.source).toBe("identity");
    expect(snapshot.sourceCurrency).toBe("USD");
    expect(snapshot.targetCurrency).toBe("USD");
  });

  it("throws when no snapshot exists for the requested pair", async () => {
    const { db } = makeFakeDb();
    const resolver = createCurrencyResolver(db, context);
    await expect(
      resolver.resolve("USD", "CAD", "2026-05-14T00:00:00.000Z")
    ).rejects.toThrow(/No FxRateSnapshot/);
  });

  it("converts Money using the resolved rate with half-up rounding", async () => {
    const { db } = makeFakeDb();
    await insertFxRateSnapshot(db, context, {
      sourceCurrency: "USD", targetCurrency: "CAD", rate: "2",
      effectiveAt: "2026-05-01T00:00:00.000Z", source: "test"
    });
    const resolver = createCurrencyResolver(db, context);
    const usd = makeMoney(1234, "USD");
    const converted = await resolver.convert(usd, "CAD", "2026-05-14T00:00:00.000Z");
    expect(converted.amountMinor).toBe(2468);
    expect(converted.currency).toBe("CAD");
    expect(converted.scale).toBe(2);
  });

  it("rounds the converted minor units half-up", async () => {
    const { db } = makeFakeDb();
    await insertFxRateSnapshot(db, context, {
      sourceCurrency: "USD", targetCurrency: "CAD", rate: "1.3625",
      effectiveAt: "2026-05-01T00:00:00.000Z", source: "test"
    });
    const resolver = createCurrencyResolver(db, context);
    const usd = makeMoney(100, "USD"); // 100 * 1.3625 = 136.25 -> rounds to 136
    const converted = await resolver.convert(usd, "CAD", "2026-05-14T00:00:00.000Z");
    expect(converted.amountMinor).toBe(136);
  });

  it("preserves the source Money's scale on conversion", async () => {
    const { db } = makeFakeDb();
    await insertFxRateSnapshot(db, context, {
      sourceCurrency: "USD", targetCurrency: "JPY", rate: "150",
      effectiveAt: "2026-05-01T00:00:00.000Z", source: "test"
    });
    const resolver = createCurrencyResolver(db, context);
    const usd = makeMoney(100, "USD", 3);
    const converted = await resolver.convert(usd, "JPY", "2026-05-14T00:00:00.000Z");
    expect(converted.scale).toBe(3);
    expect(converted.currency).toBe("JPY");
  });
});
