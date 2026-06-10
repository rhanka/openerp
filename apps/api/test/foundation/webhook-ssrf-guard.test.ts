import { describe, expect, it } from "vitest";
import {
  AddressInfo,
  DnsResolver,
  SsrfGuardError,
  assertEgressAllowed,
  isBlockedIpv4,
  isBlockedIpv6,
} from "../../src/webhook/webhook-ssrf-guard.js";

function makeStubResolver(
  handler: (host: string) => Promise<AddressInfo[]>
): DnsResolver {
  return { lookupAll: handler };
}

// ---------------------------------------------------------------------------
// assertEgressAllowed — protocol / port
// ---------------------------------------------------------------------------

describe("assertEgressAllowed — non-https protocol", () => {
  it("rejects http:// with SSRF_NON_HTTPS", async () => {
    await expect(assertEgressAllowed("http://example.com")).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof SsrfGuardError && e.code === "SSRF_NON_HTTPS"
    );
  });
});

describe("assertEgressAllowed — non-443 port", () => {
  it("rejects https://example.com:8443 with SSRF_NON_HTTPS", async () => {
    const stub = makeStubResolver(async () => [
      { address: "93.184.216.34", family: 4 },
    ]);
    await expect(
      assertEgressAllowed("https://example.com:8443", { resolver: stub })
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof SsrfGuardError && e.code === "SSRF_NON_HTTPS"
    );
  });
});

describe("assertEgressAllowed — invalid URL", () => {
  it("rejects 'not-a-url' with SSRF_NON_HTTPS", async () => {
    await expect(assertEgressAllowed("not-a-url")).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof SsrfGuardError && e.code === "SSRF_NON_HTTPS"
    );
  });
});

// ---------------------------------------------------------------------------
// assertEgressAllowed — literal IPv4
// ---------------------------------------------------------------------------

describe("assertEgressAllowed — literal IPv4 loopback", () => {
  it("rejects https://127.0.0.1/ with SSRF_PRIVATE_IP", async () => {
    await expect(assertEgressAllowed("https://127.0.0.1/")).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof SsrfGuardError && e.code === "SSRF_PRIVATE_IP"
    );
  });
});

describe("assertEgressAllowed — literal IPv4 RFC1918 table", () => {
  const cases = [
    "10.0.0.1",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.1.1",
    "100.64.0.1",
    "224.0.0.1",
    "0.0.0.0",
  ];
  for (const ip of cases) {
    it(`rejects https://${ip}/ with SSRF_PRIVATE_IP`, async () => {
      await expect(
        assertEgressAllowed(`https://${ip}/`)
      ).rejects.toSatisfy(
        (e: unknown) =>
          e instanceof SsrfGuardError && e.code === "SSRF_PRIVATE_IP"
      );
    });
  }
});

// ---------------------------------------------------------------------------
// assertEgressAllowed — literal IPv6
// ---------------------------------------------------------------------------

describe("assertEgressAllowed — literal IPv6 loopback", () => {
  it("rejects https://[::1]/ with SSRF_PRIVATE_IP", async () => {
    await expect(assertEgressAllowed("https://[::1]/")).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof SsrfGuardError && e.code === "SSRF_PRIVATE_IP"
    );
  });
});

describe("assertEgressAllowed — literal IPv6 link-local", () => {
  it("rejects https://[fe80::1]/ with SSRF_PRIVATE_IP", async () => {
    await expect(
      assertEgressAllowed("https://[fe80::1]/")
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof SsrfGuardError && e.code === "SSRF_PRIVATE_IP"
    );
  });
});

describe("assertEgressAllowed — literal IPv6 ULA", () => {
  it("rejects https://[fc00::1]/ with SSRF_PRIVATE_IP", async () => {
    await expect(
      assertEgressAllowed("https://[fc00::1]/")
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof SsrfGuardError && e.code === "SSRF_PRIVATE_IP"
    );
  });
});

// ---------------------------------------------------------------------------
// assertEgressAllowed — DNS stubs
// ---------------------------------------------------------------------------

describe("assertEgressAllowed — DNS failure", () => {
  it("rejects with SSRF_DNS_FAILED when resolver throws ENOTFOUND", async () => {
    const stub = makeStubResolver(async () => {
      throw new Error("ENOTFOUND");
    });
    await expect(
      assertEgressAllowed("https://nonexistent.invalid", { resolver: stub })
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof SsrfGuardError && e.code === "SSRF_DNS_FAILED"
    );
  });
});

describe("assertEgressAllowed — DNS empty result", () => {
  it("rejects with SSRF_DNS_FAILED when resolver returns []", async () => {
    const stub = makeStubResolver(async () => []);
    await expect(
      assertEgressAllowed("https://empty.invalid", { resolver: stub })
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof SsrfGuardError && e.code === "SSRF_DNS_FAILED"
    );
  });
});

describe("assertEgressAllowed — DNS resolves to RFC1918", () => {
  it("rejects with SSRF_PRIVATE_IP when resolver returns 10.0.0.5", async () => {
    const stub = makeStubResolver(async () => [
      { address: "10.0.0.5", family: 4 },
    ]);
    await expect(
      assertEgressAllowed("https://internal.example.com", { resolver: stub })
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof SsrfGuardError && e.code === "SSRF_PRIVATE_IP"
    );
  });
});

describe("assertEgressAllowed — DNS resolves to mixed public+private", () => {
  it("rejects with SSRF_PRIVATE_IP even when one address is public", async () => {
    const stub = makeStubResolver(async () => [
      { address: "8.8.8.8", family: 4 },
      { address: "10.0.0.5", family: 4 },
    ]);
    await expect(
      assertEgressAllowed("https://mixed.example.com", { resolver: stub })
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof SsrfGuardError && e.code === "SSRF_PRIVATE_IP"
    );
  });
});

describe("assertEgressAllowed — DNS resolves to public IPv4", () => {
  it("resolves without error for 8.8.8.8", async () => {
    const stub = makeStubResolver(async () => [
      { address: "8.8.8.8", family: 4 },
    ]);
    await expect(
      assertEgressAllowed("https://dns.google", { resolver: stub })
    ).resolves.toBeUndefined();
  });
});

describe("assertEgressAllowed — DNS resolves to public IPv6", () => {
  it("resolves without error for 2606:4700:4700::1111", async () => {
    const stub = makeStubResolver(async () => [
      { address: "2606:4700:4700::1111", family: 6 },
    ]);
    await expect(
      assertEgressAllowed("https://one.one.one.one", { resolver: stub })
    ).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// isBlockedIpv4 / isBlockedIpv6 unit table
// ---------------------------------------------------------------------------

describe("isBlockedIpv4 — unit table", () => {
  it("allows 8.8.8.8", () => {
    expect(isBlockedIpv4("8.8.8.8")).toBe(false);
  });

  it("allows 1.1.1.1", () => {
    expect(isBlockedIpv4("1.1.1.1")).toBe(false);
  });

  it("blocks empty string (malformed)", () => {
    expect(isBlockedIpv4("")).toBe(true);
  });

  it("blocks 'abc' (malformed)", () => {
    expect(isBlockedIpv4("abc")).toBe(true);
  });

  it("blocks '999.999.999.999' (out of range)", () => {
    expect(isBlockedIpv4("999.999.999.999")).toBe(true);
  });
});

describe("isBlockedIpv6 — unit table", () => {
  it("allows 2606:4700:4700::1111", () => {
    expect(isBlockedIpv6("2606:4700:4700::1111")).toBe(false);
  });

  it("blocks ::1 (loopback)", () => {
    expect(isBlockedIpv6("::1")).toBe(true);
  });

  it("blocks fe80::1 (link-local)", () => {
    expect(isBlockedIpv6("fe80::1")).toBe(true);
  });

  it("blocks fc00::1 (ULA)", () => {
    expect(isBlockedIpv6("fc00::1")).toBe(true);
  });
});
