export interface WebhookEgressRequest {
  url: string;
  body: string;
  headers: Record<string, string>;
  timeoutMs: number; // default 10_000 (default is caller's responsibility)
}

export type WebhookEgressFailureKind =
  | "TIMEOUT"
  | "NETWORK"
  | "REDIRECT_REFUSED"
  | "TLS"
  | "SSRF_PRIVATE_IP"
  | "SSRF_DNS_FAILED"
  | "SSRF_NON_HTTPS";

export type WebhookEgressResult =
  | { ok: true; httpStatus: number; durationMs: number }
  | { ok: false; kind: WebhookEgressFailureKind; httpStatus: number | null; message: string; durationMs: number };

export interface WebhookEgressPort {
  send(req: WebhookEgressRequest): Promise<WebhookEgressResult>;
}

export function makeInMemoryEgressPort(
  handler: (req: WebhookEgressRequest) => Promise<WebhookEgressResult>
): WebhookEgressPort {
  return { send: (req) => handler(req) };
}
