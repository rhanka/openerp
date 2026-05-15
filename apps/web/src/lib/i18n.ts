import { getMessage, type LocaleCode } from "@sentropic/openerp-i18n";

export function t(locale: LocaleCode, key: string): string {
  return getMessage(locale, key);
}
