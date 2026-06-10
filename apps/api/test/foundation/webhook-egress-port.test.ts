import { describe, expect, it, vi } from "vitest";
import { createFetchEgressPort } from "../../src/webhook/webhook-egress-fetch";
import { makeInMemoryEgressPort } from "../../src/webhook/webhook-egress-port";
import type { WebhookEgressRequest } from "../../src/webhook/webhook-egress-port";

function makeFetchSpy(handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: input.toString(), init });
    return handler(input, init);
  });
  return { fn: fn as unknown as typeof fetch, calls };
}

const baseRequest: WebhookEgressRequest = {
  url: "https://example.com/hook",
  body: JSON.stringify({ event: "test" }),
  headers: {},
  timeoutMs: 5_000,
};

describe("createFetchEgressPort", () => {
  it("success 200 — returns ok:true and forwards headers", async () => {
    const spy = makeFetchSpy(async () => new Response(null, { status: 200 }));
    const port = createFetchEgressPort({ fetchImpl: spy.fn });

    const result = await port.send({
      ...baseRequest,
      headers: {
        "x-openerp-signature": "v1=abc",
        "x-openerp-delivery-id": "deliv_1",
        "x-openerp-signed-at": "1700000000",
        "x-openerp-event-type": "crm.lead.created",
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.httpStatus).toBe(200);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    }

    expect(spy.calls).toHaveLength(1);
    const sentHeaders = spy.calls[0]!.init?.headers as Record<string, string>;
    expect(sentHeaders["content-type"]).toBe("application/json");
    expect(sentHeaders["x-openerp-signature"]).toBe("v1=abc");
    expect(sentHeaders["x-openerp-delivery-id"]).toBe("deliv_1");
    expect(sentHeaders["x-openerp-signed-at"]).toBe("1700000000");
    expect(sentHeaders["x-openerp-event-type"]).toBe("crm.lead.created");
  });

  it("timeout — returns ok:false kind:TIMEOUT within ~150ms", async () => {
    const spy = makeFetchSpy((_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        // Resolve once the signal aborts so the test does not hang.
        init?.signal?.addEventListener("abort", () =>
          reject(Object.assign(new Error("The operation was aborted"), { name: "AbortError" }))
        );
      })
    );
    const port = createFetchEgressPort({ fetchImpl: spy.fn });

    const start = Date.now();
    const result = await port.send({ ...baseRequest, timeoutMs: 50 });
    const elapsed = Date.now() - start;

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("TIMEOUT");
      expect(result.httpStatus).toBeNull();
    }
    expect(elapsed).toBeLessThan(150);
  });

  it("redirect refusal — returns ok:false kind:REDIRECT_REFUSED httpStatus:301", async () => {
    const spy = makeFetchSpy(async () => new Response(null, { status: 301 }));
    const port = createFetchEgressPort({ fetchImpl: spy.fn });

    const result = await port.send(baseRequest);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("REDIRECT_REFUSED");
      expect(result.httpStatus).toBe(301);
    }
  });

  it("network error — returns ok:false kind:NETWORK", async () => {
    const spy = makeFetchSpy(async () => { throw new TypeError("fetch failed"); });
    const port = createFetchEgressPort({ fetchImpl: spy.fn });

    const result = await port.send(baseRequest);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("NETWORK");
      expect(result.httpStatus).toBeNull();
    }
  });

  it("headers forwarded — all four caller headers + content-type present", async () => {
    const spy = makeFetchSpy(async () => new Response(null, { status: 200 }));
    const port = createFetchEgressPort({ fetchImpl: spy.fn });

    await port.send({
      ...baseRequest,
      headers: {
        "x-openerp-signature": "v1=abc",
        "x-openerp-delivery-id": "deliv_1",
        "x-openerp-signed-at": "1700000000",
        "x-openerp-event-type": "crm.lead.created",
      },
    });

    expect(spy.calls).toHaveLength(1);
    const sentHeaders = spy.calls[0]!.init?.headers as Record<string, string>;
    expect(sentHeaders["content-type"]).toBe("application/json");
    expect(sentHeaders["x-openerp-signature"]).toBe("v1=abc");
    expect(sentHeaders["x-openerp-delivery-id"]).toBe("deliv_1");
    expect(sentHeaders["x-openerp-signed-at"]).toBe("1700000000");
    expect(sentHeaders["x-openerp-event-type"]).toBe("crm.lead.created");
  });
});

describe("makeInMemoryEgressPort", () => {
  it("returns the configured result without touching fetch", async () => {
    const port = makeInMemoryEgressPort(async (_req) => ({
      ok: true,
      httpStatus: 202,
      durationMs: 7,
    }));

    const result = await port.send(baseRequest);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.httpStatus).toBe(202);
      expect(result.durationMs).toBe(7);
    }
  });
});
