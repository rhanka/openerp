import { getMessage, type LocaleCode } from "@sentropic/openerp-i18n";

export type { LocaleCode };

/** Locales supported by the foundation catalog. Must stay in sync with
 *  packages/i18n/src/foundation.{en,fr}.json. */
export const SUPPORTED_LOCALES: readonly LocaleCode[] = ["en", "fr"];

export function isLocaleCode(value: string): value is LocaleCode {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function t(locale: LocaleCode, key: string): string {
  return getMessage(locale, key);
}
