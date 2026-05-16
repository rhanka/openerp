import type { LocaleCode } from "$lib/i18n";

declare global {
  namespace App {
    interface Locals {
      locale: LocaleCode;
    }
  }
}

export {};
