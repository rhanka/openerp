import type { CurrencyResolver, FxRateSnapshot, Money } from "@openerp/domain";
import { makeMoney } from "@openerp/domain";
import type { Queryable, TenantContext } from "../db/client";
import { findFxRateAt } from "./fx-rates";

// Factory for the CurrencyResolver contract (PG-06 article 1).
// Backed by fx_rate_snapshots. Rounding policy for MVP: half-up via Math.round on
// minor units. This is intentional and explicit; revisit if banker's rounding becomes
// required for statutory billing.

export function createCurrencyResolver(db: Queryable, context: TenantContext): CurrencyResolver {
  return {
    async resolve(sourceCurrency, targetCurrency, effectiveAt) {
      if (sourceCurrency.toUpperCase() === targetCurrency.toUpperCase()) {
        return identityRate(context.organizationId, sourceCurrency, effectiveAt);
      }
      const snapshot = await findFxRateAt(db, context, {
        sourceCurrency: sourceCurrency.toUpperCase(),
        targetCurrency: targetCurrency.toUpperCase(),
        effectiveAt
      });
      if (!snapshot) {
        throw new Error(
          `No FxRateSnapshot for ${sourceCurrency} -> ${targetCurrency} at or before ${effectiveAt}`
        );
      }
      return snapshot;
    },

    async convert(amount, targetCurrency, effectiveAt) {
      const snapshot = await this.resolve(amount.currency, targetCurrency, effectiveAt);
      const rate = Number(snapshot.rate);
      if (!Number.isFinite(rate) || rate <= 0) {
        throw new Error(`FxRateSnapshot has invalid rate '${snapshot.rate}'`);
      }
      const convertedMinor = Math.round(amount.amountMinor * rate);
      return makeMoney(convertedMinor, snapshot.targetCurrency, amount.scale);
    }
  };
}

function identityRate(organizationId: string, currency: string, effectiveAt: string): FxRateSnapshot {
  const code = currency.toUpperCase();
  return {
    id: `identity:${code}:${effectiveAt}`,
    organizationId,
    sourceCurrency: code,
    targetCurrency: code,
    rate: "1",
    effectiveAt,
    source: "identity"
  };
}
