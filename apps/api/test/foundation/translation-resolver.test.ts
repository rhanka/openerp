import { beforeEach, describe, expect, it } from "vitest";

import type { Queryable } from "../../src/db/client";
import {
  TranslationKeyMissingError,
  _clearFormatterCache,
  resolveTranslation
} from "../../src/foundation/translation-resolver";
import type { TranslationKey } from "../../src/foundation/translation-keys";

function makeFakeDb(seed: TranslationKey[] = []) {
  const rows: TranslationKey[] = [...seed];
  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      if (text.includes("from translation_keys")
          && text.includes("namespace = $2 and key = $3 and locale = $4")) {
        const [organizationId, namespace, key, locale] = values as [
          string, string, string, "en" | "fr"
        ];
        const found = rows.find((r) =>
          r.organizationId === organizationId && r.namespace === namespace
          && r.key === key && r.locale === locale);
        return { rows: found ? [found as unknown as T] : [] };
      }
      return { rows: [] };
    }
  };
  return { db };
}

const context = { organizationId: "org_1", actorUserId: "user_1" };

function row(overrides: Partial<TranslationKey>): TranslationKey {
  return {
    id: "tk_x",
    organizationId: "org_1",
    namespace: "crm.pipeline_stage",
    key: "discovery",
    locale: "fr",
    label: "Découverte",
    description: null,
    status: "active",
    updatedAt: "2026-05-15T00:00:00.000Z",
    ...overrides
  };
}

describe("resolveTranslation (PG-05 ICU runtime)", () => {
  beforeEach(() => _clearFormatterCache());

  it("returns the row label as-is when no values are passed", async () => {
    const { db } = makeFakeDb([row({ label: "Découverte" })]);
    const out = await resolveTranslation(db, context, {
      namespace: "crm.pipeline_stage",
      key: "discovery",
      locale: "fr"
    });
    expect(out).toBe("Découverte");
  });

  it("interpolates ICU placeholders with provided values", async () => {
    const { db } = makeFakeDb([
      row({ key: "welcome", label: "Bonjour {name}, vous avez {count} message(s)." })
    ]);
    const out = await resolveTranslation(db, context, {
      namespace: "crm.pipeline_stage",
      key: "welcome",
      locale: "fr",
      values: { name: "Alice", count: 3 }
    });
    expect(out).toBe("Bonjour Alice, vous avez 3 message(s).");
  });

  it("uses ICU plural for locale-aware pluralisation (fr)", async () => {
    const { db } = makeFakeDb([
      row({
        key: "items",
        label: "{count, plural, =0 {Aucun élément} one {# élément} other {# éléments}}"
      })
    ]);
    expect(await resolveTranslation(db, context, {
      namespace: "crm.pipeline_stage", key: "items", locale: "fr", values: { count: 0 }
    })).toBe("Aucun élément");
    expect(await resolveTranslation(db, context, {
      namespace: "crm.pipeline_stage", key: "items", locale: "fr", values: { count: 1 }
    })).toBe("1 élément");
    expect(await resolveTranslation(db, context, {
      namespace: "crm.pipeline_stage", key: "items", locale: "fr", values: { count: 5 }
    })).toBe("5 éléments");
  });

  it("falls back to fallbackLocale when primary is missing", async () => {
    const { db } = makeFakeDb([row({ locale: "en", label: "Discovery" })]);
    const out = await resolveTranslation(db, context, {
      namespace: "crm.pipeline_stage",
      key: "discovery",
      locale: "fr",
      fallbackLocale: "en"
    });
    expect(out).toBe("Discovery");
  });

  it("falls back to fallbackText when both locales miss", async () => {
    const { db } = makeFakeDb();
    const out = await resolveTranslation(db, context, {
      namespace: "crm.pipeline_stage",
      key: "discovery",
      locale: "fr",
      fallbackLocale: "en",
      fallbackText: "Discovery (default)"
    });
    expect(out).toBe("Discovery (default)");
  });

  it("throws TranslationKeyMissingError when no fallback is provided", async () => {
    const { db } = makeFakeDb();
    await expect(
      resolveTranslation(db, context, {
        namespace: "crm.pipeline_stage",
        key: "discovery",
        locale: "fr"
      })
    ).rejects.toBeInstanceOf(TranslationKeyMissingError);
  });

  it("skips archived rows and falls back if no other locale available", async () => {
    const { db } = makeFakeDb([
      row({ locale: "fr", status: "archived", label: "ancienne" }),
      row({ locale: "en", label: "Discovery" })
    ]);
    const out = await resolveTranslation(db, context, {
      namespace: "crm.pipeline_stage",
      key: "discovery",
      locale: "fr",
      fallbackLocale: "en"
    });
    expect(out).toBe("Discovery");
  });
});
