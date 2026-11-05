import type { LocaleCode } from "$lib/i18n";

declare global {
  namespace App {
    interface Locals {
      locale: LocaleCode;
      session: {
        token: string;
        userIdentityId: string;
        organizationId: string;
        user?: {
          displayName: string | null;
          email: string | null;
          id: string;
          role: string;
        };
      } | null;
    }
  }
}

export {};
