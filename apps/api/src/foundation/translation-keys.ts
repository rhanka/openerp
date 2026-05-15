import type { LocaleCode } from "@sentropic/openerp-domain";
import type { Queryable, TenantContext } from "../db/client";
import { assertTenantContext } from "../db/client";

// Repository for TranslationKey rows (PG-05). Holds tenant-scoped labels for
// dynamic data (pipeline stages, service activities, etc.). Static UI strings
// stay in packages/i18n catalogs.

export interface TranslationKey {
  id: string;
  organizationId: string;
  namespace: string;
  key: string;
  locale: LocaleCode;
  label: string;
  description: string | null;
  status: "draft" | "active" | "archived";
  updatedAt: string;
}

const TK_COLUMNS = `
  id,
  organization_id as "organizationId",
  namespace,
  key,
  locale,
  label,
  description,
  status,
  updated_at as "updatedAt"
`;

export interface UpsertTranslationKeyInput {
  namespace: string;
  key: string;
  locale: LocaleCode;
  label: string;
  description?: string | null;
  status?: TranslationKey["status"];
}

export async function upsertTranslationKey(
  db: Queryable,
  context: TenantContext,
  input: UpsertTranslationKeyInput
): Promise<TranslationKey> {
  assertTenantContext(context);
  const result = await db.query<TranslationKey>(
    `insert into translation_keys (
       organization_id, namespace, key, locale, label, description, status, updated_at
     ) values ($1, $2, $3, $4, $5, $6, $7, now())
     on conflict (organization_id, namespace, key, locale) do update
       set label = excluded.label,
           description = excluded.description,
           status = excluded.status,
           updated_at = now()
     returning ${TK_COLUMNS}`,
    [
      context.organizationId,
      input.namespace,
      input.key,
      input.locale,
      input.label,
      input.description ?? null,
      input.status ?? "active"
    ]
  );
  return result.rows[0]!;
}

export async function findTranslationKey(
  db: Queryable,
  context: TenantContext,
  query: { namespace: string; key: string; locale: LocaleCode }
): Promise<TranslationKey | null> {
  assertTenantContext(context);
  const result = await db.query<TranslationKey>(
    `select ${TK_COLUMNS}
       from translation_keys
      where organization_id = $1 and namespace = $2 and key = $3 and locale = $4`,
    [context.organizationId, query.namespace, query.key, query.locale]
  );
  return result.rows[0] ?? null;
}

export async function listTranslationKeys(
  db: Queryable,
  context: TenantContext,
  query: { namespace?: string; locale?: LocaleCode; statuses?: TranslationKey["status"][] }
): Promise<TranslationKey[]> {
  assertTenantContext(context);
  const filters: string[] = ["organization_id = $1"];
  const values: unknown[] = [context.organizationId];
  let i = 2;
  if (query.namespace) {
    filters.push(`namespace = $${i++}`);
    values.push(query.namespace);
  }
  if (query.locale) {
    filters.push(`locale = $${i++}`);
    values.push(query.locale);
  }
  if (query.statuses && query.statuses.length > 0) {
    filters.push(`status = any($${i++}::text[])`);
    values.push(query.statuses);
  }
  const result = await db.query<TranslationKey>(
    `select ${TK_COLUMNS}
       from translation_keys
      where ${filters.join(" and ")}
      order by namespace, key, locale`,
    values
  );
  return result.rows;
}

export async function archiveTranslationKey(
  db: Queryable,
  context: TenantContext,
  id: string
): Promise<TranslationKey | null> {
  assertTenantContext(context);
  const result = await db.query<TranslationKey>(
    `update translation_keys
        set status = 'archived', updated_at = now()
      where id = $1 and organization_id = $2
      returning ${TK_COLUMNS}`,
    [id, context.organizationId]
  );
  return result.rows[0] ?? null;
}
