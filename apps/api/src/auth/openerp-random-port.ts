import { randomBytes, randomUUID } from "node:crypto";
import type { AuthHonoRandomPort } from "@sentropic/auth-hono";

export function createOpenERPRandomPort(): AuthHonoRandomPort {
  return {
    uuid(): string {
      return randomUUID();
    },

    bytes(length: number): Uint8Array {
      return new Uint8Array(randomBytes(length));
    },

    numericCode(length: number): string {
      // Generate a cryptographically random decimal string of `length` digits.
      const buf = randomBytes(Math.ceil(length * 2));
      let result = "";
      for (const byte of buf) {
        result += (byte % 10).toString();
        if (result.length >= length) break;
      }
      return result.slice(0, length);
    },

    token(bytes: number): string {
      return randomBytes(bytes).toString("base64url");
    },
  };
}
