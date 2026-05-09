import { getMessage, type LocaleCode } from "@openerp/i18n";

export function t(locale: LocaleCode, key: string): string {
  return getMessage(locale, key);
}
