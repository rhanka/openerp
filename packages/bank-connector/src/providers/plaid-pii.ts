/**
 * Plaid response bodies are never a logging contract. This helper exists for
 * the rare diagnostic path that must inspect an error payload: it strips the
 * sensitive provider fields before any value can leave the provider boundary.
 */

export type RedactedPlaidPayload = Record<string, unknown>;

const REDACTED = "[REDACTED]";

const SENSITIVE_FIELD_NAMES = new Set([
  "access_token",
  "account_id",
  "account_number",
  "address",
  "auth_token",
  "client_id",
  "cursor",
  "date_of_birth",
  "email",
  "iban",
  "item_id",
  "mask",
  "merchant_name",
  "name",
  "official_name",
  "phone_number",
  "public_token",
  "routing_number",
  "secret",
  "ssn",
  "transaction_id",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Redact recursively so nested account and transaction objects cannot escape diagnostic code. */
export function redactPlaidSensitiveFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactPlaidSensitiveFields);
  if (!isRecord(value)) return value;

  const redacted: RedactedPlaidPayload = {};
  for (const [key, nested] of Object.entries(value)) {
    redacted[key] = SENSITIVE_FIELD_NAMES.has(key.toLowerCase())
      ? REDACTED
      : redactPlaidSensitiveFields(nested);
  }
  return redacted;
}

/**
 * A provider failure retains only its endpoint and a constrained machine code.
 * It intentionally does not retain the original payload or its error message.
 */
export class PlaidProviderError extends Error {
  constructor(
    readonly endpoint: string,
    readonly errorCode: string,
  ) {
    super(`plaid ${endpoint} failed: ${errorCode}`);
    this.name = "PlaidProviderError";
  }
}

/** Extract a safe error code after redaction; arbitrary provider text becomes UNKNOWN_ERROR. */
export function safePlaidErrorCode(payload: unknown): string {
  const redacted = redactPlaidSensitiveFields(payload);
  if (!isRecord(redacted)) return "UNKNOWN_ERROR";
  const errorCode = redacted.error_code;
  return typeof errorCode === "string" && /^[A-Z0-9_]{1,128}$/.test(errorCode)
    ? errorCode
    : "UNKNOWN_ERROR";
}
