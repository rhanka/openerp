import { IntlMessageFormat } from "intl-messageformat";

import type { LocaleCode } from "@sentropic/openerp-domain";

import type { Queryable, TenantContext } from "../db/client";
import { findTranslationKey } from "./translation-keys";

// ICU MessageFormat resolver (PG-05). Pulls tenant-scoped TranslationKey rows
// from the DB and formats their ICU template with caller-provided values.
// Static UI strings stay in packages/i18n catalogs — this resolver only owns
// the tenant-owned data labels (pipeline stages, service activity catalog,
// etc.).

export interface ResolveTranslationInput {
  namespace: string;
  key: string;
  locale: LocaleCode;
  values?: Record<string, string | number | boolean | Date>;
  fallbackLocale?: LocaleCode;
  fallbackText?: string;
}

export class TranslationKeyMissingError extends Error {
  readonly code = "TRANSLATION_KEY_MISSING";
  constructor(namespace: string, key: string, locale: LocaleCode) {
    super(`No translation_key row for ${namespace}.${key} in ${locale}`);
  }
}

const formatCache = new Map<string, IntlMessageFormat>();

function getFormatter(template: string, locale: LocaleCode): IntlMessageFormat {
  const cacheKey = `${locale}::${template}`;
  let formatter = formatCache.get(cacheKey);
  if (!formatter) {
    formatter = new IntlMessageFormat(template, locale);
    formatCache.set(cacheKey, formatter);
  }
  return formatter;
}

export async function resolveTranslation(
  db: Queryable,
  context: TenantContext,
  input: ResolveTranslationInput
): Promise<string> {
  const primary = await findTranslationKey(db, context, {
    namespace: input.namespace,
    key: input.key,
    locale: input.locale
  });
  if (primary && primary.status !== "archived") {
    return formatPart(primary.label, input.locale, input.values);
  }
  if (input.fallbackLocale && input.fallbackLocale !== input.locale) {
    const fallback = await findTranslationKey(db, context, {
      namespace: input.namespace,
      key: input.key,
      locale: input.fallbackLocale
    });
    if (fallback && fallback.status !== "archived") {
      return formatPart(fallback.label, input.fallbackLocale, input.values);
    }
  }
  if (input.fallbackText !== undefined) {
    return formatPart(input.fallbackText, input.locale, input.values);
  }
  throw new TranslationKeyMissingError(input.namespace, input.key, input.locale);
}

function formatPart(
  template: string,
  locale: LocaleCode,
  values?: Record<string, string | number | boolean | Date>
): string {
  if (!values || Object.keys(values).length === 0) {
    return template;
  }
  const formatter = getFormatter(template, locale);
  const formatted = formatter.format<string>(values);
  if (Array.isArray(formatted)) return formatted.join("");
  if (typeof formatted === "string") return formatted;
  return String(formatted ?? "");
}

/** Clear the in-memory formatter cache (test/utility). */
export function _clearFormatterCache(): void {
  formatCache.clear();
}
