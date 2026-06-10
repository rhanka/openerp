import type { WebhookEgressPort, WebhookEgressRequest, WebhookEgressResult } from "./webhook-egress-port";

export interface CreateFetchEgressPortOptions {
  /** Override global fetch (testing). */
  fetchImpl?: typeof fetch;
  /** Optional SSRF guard wired in W0-ssrf-guard. No-op by default. */
  ssrfGuard?: (url: string) => Promise<void>;
  /** Override the clock for durationMs computation (testing). Returns ms epoch. */
  now?: () => number;
}

export function createFetchEgressPort(opts: CreateFetchEgressPortOptions = {}): WebhookEgressPort {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const ssrfGuard = opts.ssrfGuard ?? (async () => {});
  const now = opts.now ?? Date.now;

  return {
    async send(req: WebhookEgressRequest): Promise<WebhookEgressResult> {
      const startedAt = now();

      try {
        await ssrfGuard(req.url);
      } catch (err) {
        const code = (err as { code?: string }).code;
        const kind: "SSRF_PRIVATE_IP" | "SSRF_DNS_FAILED" | "SSRF_NON_HTTPS" =
          code === "SSRF_DNS_FAILED" ? "SSRF_DNS_FAILED" :
          code === "SSRF_NON_HTTPS" ? "SSRF_NON_HTTPS" :
          "SSRF_PRIVATE_IP";
        return {
          ok: false,
          kind,
          httpStatus: null,
          message: (err as Error).message ?? "SSRF guard rejected",
          durationMs: now() - startedAt,
        };
      }

      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => controller.abort(), req.timeoutMs);

      try {
        const response = await fetchImpl(req.url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...req.headers,
          },
          body: req.body,
          redirect: "manual",
          signal: controller.signal,
        });

        clearTimeout(timeoutHandle);

        // redirect: "manual" surfaces 3xx without following
        if (response.status >= 300 && response.status < 400) {
          return {
            ok: false,
            kind: "REDIRECT_REFUSED",
            httpStatus: response.status,
            message: `Redirect refused (status ${response.status})`,
            durationMs: now() - startedAt,
          };
        }

        return {
          ok: true,
          httpStatus: response.status,
          durationMs: now() - startedAt,
        };
      } catch (err) {
        clearTimeout(timeoutHandle);
        const isAbort = (err as { name?: string }).name === "AbortError"
          || ((err as { message?: string }).message ?? "").includes("aborted");
        return {
          ok: false,
          kind: isAbort ? "TIMEOUT" : "NETWORK",
          httpStatus: null,
          message: (err as Error).message ?? "fetch failed",
          durationMs: now() - startedAt,
        };
      }
    },
  };
}
