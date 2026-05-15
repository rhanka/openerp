import { describe, expect, it } from "vitest";

import type { Queryable } from "../../src/db/client";
import {
  type TranslationKey,
  archiveTranslationKey,
  findTranslationKey,
  listTranslationKeys,
  upsertTranslationKey
} from "../../src/foundation/translation-keys";

function makeFakeDb() {
  const rows: TranslationKey[] = [];

  const db: Queryable = {
    async query<T = unknown>(text: string, values: unknown[] = []): Promise<{ rows: T[] }> {
      const t = text;

      if (t.includes("insert into translation_keys") && t.includes("on conflict")) {
        const [organizationId, namespace, key, locale, label, description, status] = values as [
          string, string, string, "en" | "fr", string, string | null, "draft" | "active" | "archived"
        ];
        const idx = rows.findIndex((r) =>
          r.organizationId === organizationId && r.namespace === namespace
          && r.key === key && r.locale === locale);
        if (idx !== -1) {
          rows[idx] = {
            ...rows[idx]!,
            label,
            description,
            status,
            updatedAt: "2026-05-14T22:00:00.000Z"
          };
          return { rows: [rows[idx]! as unknown as T] };
        }
        const row: TranslationKey = {
          id: `tk_${rows.length + 1}`,
          organizationId,
          namespace,
          key,
          locale,
          label,
          description,
          status,
          updatedAt: "2026-05-14T22:00:00.000Z"
        };
        rows.push(row);
        return { rows: [row as unknown as T] };
      }

      if (t.includes("from translation_keys")
          && t.includes("namespace = $2 and key = $3 and locale = $4")) {
        const [organizationId, namespace, key, locale] = values as [string, string, string, "en" | "fr"];
        const found = rows.find((r) =>
          r.organizationId === organizationId && r.namespace === namespace
          && r.key === key && r.locale === locale);
        return { rows: found ? [found as unknown as T] : [] };
      }

      if (t.includes("from translation_keys")) {
        const [organizationId] = values as [string];
        const filtered = rows.filter((r) => r.organizationId === organizationId);
        return { rows: filtered.sort((a, b) =>
          a.namespace.localeCompare(b.namespace)
          || a.key.localeCompare(b.key)
          || a.locale.localeCompare(b.locale)
        ) as unknown as T[] };
      }

      if (t.includes("update translation_keys") && t.includes("status = 'archived'")) {
        const [id, organizationId] = values as [string, string];
        const idx = rows.findIndex((r) => r.id === id && r.organizationId === organizationId);
        if (idx === -1) return { rows: [] };
        rows[idx] = { ...rows[idx]!, status: "archived", updatedAt: "2026-05-14T23:00:00.000Z" };
        return { rows: [rows[idx]! as unknown as T] };
      }

      return { rows: [] };
    }
  };
  return { db };
}

const context = { organizationId: "org_1", actorUserId: "user_1" };

describe("TranslationKey repository (PG-05)", () => {
  it("inserts a new key on first upsert", async () => {
    const { db } = makeFakeDb();
    const row = await upsertTranslationKey(db, context, {
      namespace: "crm.pipeline_stage",
      key: "stage_42",
      locale: "fr",
      label: "Découverte"
    });
    expect(row.label).toBe("Découverte");
    expect(row.status).toBe("active");
  });

  it("updates label on conflicting key (same org+ns+key+locale)", async () => {
    const { db } = makeFakeDb();
    await upsertTranslationKey(db, context, {
      namespace: "crm.pipeline_stage",
      key: "stage_42",
      locale: "fr",
      label: "Initial"
    });
    const updated = await upsertTranslationKey(db, context, {
      namespace: "crm.pipeline_stage",
      key: "stage_42",
      locale: "fr",
      label: "Découverte"
    });
    expect(updated.label).toBe("Découverte");
  });

  it("finds a key by tenant + namespace + key + locale", async () => {
    const { db } = makeFakeDb();
    await upsertTranslationKey(db, context, {
      namespace: "crm.pipeline_stage",
      key: "stage_42",
      locale: "fr",
      label: "Découverte"
    });
    const found = await findTranslationKey(db, context, {
      namespace: "crm.pipeline_stage",
      key: "stage_42",
      locale: "fr"
    });
    expect(found?.label).toBe("Découverte");
    expect(await findTranslationKey(db, context, {
      namespace: "crm.pipeline_stage",
      key: "stage_42",
      locale: "en"
    })).toBeNull();
  });

  it("lists keys scoped to the tenant", async () => {
    const { db } = makeFakeDb();
    await upsertTranslationKey(db, context, {
      namespace: "crm.pipeline_stage", key: "stage_42", locale: "fr", label: "Découverte"
    });
    await upsertTranslationKey(db, context, {
      namespace: "crm.pipeline_stage", key: "stage_42", locale: "en", label: "Discovery"
    });
    const list = await listTranslationKeys(db, context, { namespace: "crm.pipeline_stage" });
    expect(list).toHaveLength(2);
    expect(list.map((r) => r.locale)).toEqual(["en", "fr"]);
  });

  it("archives a key without deleting it", async () => {
    const { db } = makeFakeDb();
    const created = await upsertTranslationKey(db, context, {
      namespace: "crm.pipeline_stage", key: "stage_42", locale: "fr", label: "Découverte"
    });
    const archived = await archiveTranslationKey(db, context, created.id);
    expect(archived?.status).toBe("archived");
  });
});
