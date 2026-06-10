import * as dns from "node:dns/promises";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type SsrfRejectionCode =
  | "SSRF_NON_HTTPS"
  | "SSRF_DNS_FAILED"
  | "SSRF_PRIVATE_IP";

export class SsrfGuardError extends Error {
  public readonly code: SsrfRejectionCode;
  constructor(code: SsrfRejectionCode, message: string) {
    super(message);
    this.code = code;
    this.name = "SsrfGuardError";
  }
}

// ---------------------------------------------------------------------------
// Resolver interface (for tests + DNS rebinding defense)
// ---------------------------------------------------------------------------

export interface AddressInfo {
  address: string;
  family: 4 | 6;
}

export interface DnsResolver {
  lookupAll(hostname: string): Promise<AddressInfo[]>;
}

export const nodeDnsResolver: DnsResolver = {
  async lookupAll(hostname) {
    const records = await dns.lookup(hostname, { all: true });
    return records.map((r) => ({ address: r.address, family: r.family as 4 | 6 }));
  },
};

// ---------------------------------------------------------------------------
// IP classification
// ---------------------------------------------------------------------------

/** True if an IPv4 dotted-quad string lies in a blocked range. */
export function isBlockedIpv4(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return true; // malformed — safer to block
  const o = parts.map((p) => Number(p));
  if (o.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = o as [number, number, number, number];

  // 0.0.0.0/8 — "this network"
  if (a === 0) return true;
  // 10.0.0.0/8
  if (a === 10) return true;
  // 100.64.0.0/10 — CGNAT
  if (a === 100 && b >= 64 && b <= 127) return true;
  // 127.0.0.0/8 — loopback
  if (a === 127) return true;
  // 169.254.0.0/16 — link-local
  if (a === 169 && b === 254) return true;
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.0.0.0/24 — IETF Protocol Assignments
  if (a === 192 && b === 0 && o[2] === 0) return true;
  // 192.0.2.0/24 — TEST-NET-1
  if (a === 192 && b === 0 && o[2] === 2) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  // 198.18.0.0/15 — benchmarking
  if (a === 198 && (b === 18 || b === 19)) return true;
  // 198.51.100.0/24 — TEST-NET-2
  if (a === 198 && b === 51 && o[2] === 100) return true;
  // 203.0.113.0/24 — TEST-NET-3
  if (a === 203 && b === 0 && o[2] === 113) return true;
  // 224.0.0.0/4 — multicast
  if (a >= 224 && a <= 239) return true;
  // 240.0.0.0/4 — reserved
  if (a >= 240) return true;

  return false;
}

/** True if an IPv6 string lies in a blocked range. */
export function isBlockedIpv6(ip: string): boolean {
  // Normalise to lowercase
  const v = ip.toLowerCase();

  // ::1 — loopback
  if (v === "::1") return true;
  // :: — unspecified
  if (v === "::") return true;
  // ::ffff:x.x.x.x — IPv4-mapped: recurse into IPv4 classifier
  if (v.startsWith("::ffff:")) {
    const ipv4 = v.slice(7);
    if (ipv4.includes(".")) return isBlockedIpv4(ipv4);
  }
  // fe80::/10 — link-local
  if (/^fe[89ab]/.test(v)) return true;
  // fc00::/7 — unique local
  if (/^f[cd]/.test(v)) return true;
  // ff00::/8 — multicast
  if (v.startsWith("ff")) return true;
  // 100::/64 — discard-only
  if (/^100:0*:0*:0*:/.test(v)) return true;
  // 2001:db8::/32 — documentation
  if (v.startsWith("2001:db8")) return true;
  // ::/96 — IPv4-compatible (deprecated but block anyway)
  if (/^0*:0*:0*:0*:0*:0*:/.test(v)) return true;

  return false;
}

// ---------------------------------------------------------------------------
// Main guard
// ---------------------------------------------------------------------------

export interface AssertEgressAllowedOptions {
  /** Override DNS resolver (testing or custom strategy). */
  resolver?: DnsResolver;
  /** Allowed protocols. Default: ["https:"]. */
  allowedProtocols?: string[];
  /** Allowed ports. Default: [443]. */
  allowedPorts?: number[];
}

/**
 * Throw SsrfGuardError if the URL must not be reached:
 *  - non-https protocol
 *  - port other than 443 (default)
 *  - DNS lookup failure
 *  - resolves to any private / loopback / link-local / multicast / broadcast / ULA address (v4 or v6)
 *
 * DNS rebinding defense: callers should pre-resolve via this guard and then
 * pass `lookup` to fetch/http so the connection uses the same address that
 * was validated.
 */
export async function assertEgressAllowed(
  rawUrl: string,
  options: AssertEgressAllowedOptions = {}
): Promise<void> {
  const allowedProtocols = options.allowedProtocols ?? ["https:"];
  const allowedPorts = options.allowedPorts ?? [443];
  const resolver = options.resolver ?? nodeDnsResolver;

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch (err) {
    throw new SsrfGuardError("SSRF_NON_HTTPS", `Invalid URL: ${(err as Error).message}`);
  }

  if (!allowedProtocols.includes(parsed.protocol)) {
    throw new SsrfGuardError(
      "SSRF_NON_HTTPS",
      `Protocol not allowed: ${parsed.protocol}`
    );
  }

  const port = parsed.port !== "" ? Number(parsed.port) : (parsed.protocol === "https:" ? 443 : 80);
  if (!allowedPorts.includes(port)) {
    throw new SsrfGuardError(
      "SSRF_NON_HTTPS",
      `Port not allowed: ${port}`
    );
  }

  // parsed.hostname for IPv6 literals keeps brackets, e.g. "[::1]"
  const rawHostname = parsed.hostname;
  const isBracketedIpv6 = rawHostname.startsWith("[") && rawHostname.endsWith("]");
  const hostname = isBracketedIpv6
    ? rawHostname.slice(1, -1)
    : rawHostname;

  // If hostname is a literal IP, classify directly.
  const looksLikeIpv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
  const looksLikeIpv6 = isBracketedIpv6 || hostname.includes(":");
  if (looksLikeIpv4) {
    if (isBlockedIpv4(hostname)) {
      throw new SsrfGuardError("SSRF_PRIVATE_IP", `Address blocked: ${hostname}`);
    }
    return;
  }
  if (looksLikeIpv6) {
    if (isBlockedIpv6(hostname)) {
      throw new SsrfGuardError("SSRF_PRIVATE_IP", `Address blocked: ${hostname}`);
    }
    return;
  }

  let addresses: AddressInfo[];
  try {
    addresses = await resolver.lookupAll(hostname);
  } catch (err) {
    throw new SsrfGuardError(
      "SSRF_DNS_FAILED",
      `DNS resolution failed for ${hostname}: ${(err as Error).message}`
    );
  }

  if (addresses.length === 0) {
    throw new SsrfGuardError("SSRF_DNS_FAILED", `No DNS records for ${hostname}`);
  }

  for (const addr of addresses) {
    const blocked =
      addr.family === 4 ? isBlockedIpv4(addr.address) : isBlockedIpv6(addr.address);
    if (blocked) {
      throw new SsrfGuardError(
        "SSRF_PRIVATE_IP",
        `Address blocked: ${addr.address} (resolved from ${hostname})`
      );
    }
  }
}
