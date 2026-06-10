import type { AuthHonoClockPort } from "@sentropic/auth-hono";

export function createOpenERPClockPort(): AuthHonoClockPort {
  return {
    now(): Date {
      return new Date();
    },

    addSeconds(date: Date, seconds: number): Date {
      return new Date(date.getTime() + seconds * 1000);
    },
  };
}
