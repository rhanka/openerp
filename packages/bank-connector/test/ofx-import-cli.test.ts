import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { NormalizedAccount, NormalizedTransaction } from "../src/fdx.js";
import {
  prepareOfxImport,
  runOfxImportCli,
} from "../src/ofx-import-cli.js";
import {
  DEFAULT_OFX_MAX_BYTES,
  DEFAULT_OFX_MAX_TRANSACTIONS,
  assertRegularOfxFile,
  parseOfx,
  readOfxSnapshot,
} from "../src/providers/ofx-snapshot.js";

let workspaceDir: string;
let baseDir: string;

beforeEach(() => {
  workspaceDir = mkdtempSync(join(tmpdir(), "ofx-import-cli-"));
  baseDir = join(workspaceDir, "import-base");
  mkdirSync(baseDir);
});

afterEach(() => {
  rmSync(workspaceDir, { recursive: true, force: true });
});

interface TransactionSource {
  fitid?: string;
  postedAt?: string;
  amount?: string;
  name?: string;
  memo?: string;
}

function makeOfx(options: {
  accountId?: string;
  currency?: string;
  bankId?: string;
  transactions?: TransactionSource[];
} = {}): string {
  const accountId = options.accountId ?? "123456789";
  const currency = options.currency ?? "CAD";
  const bankId = options.bankId ?? "815";
  const transactions = options.transactions ?? [{
    fitid: "FITID-2026-0001",
    postedAt: "20260725123000",
    amount: "-42.50",
    name: "Example clean fixture",
  }];

  return [
    "OFXHEADER:100",
    "DATA:OFXSGML",
    "",
    "<OFX>",
    "<BANKMSGSRSV1>",
    "<STMTTRNRS>",
    "<STMTRS>",
    `<CURDEF>${currency}`,
    "<BANKACCTFROM>",
    `<BANKID>${bankId}`,
    `<ACCTID>${accountId}`,
    "<ACCTTYPE>CHECKING",
    "</BANKACCTFROM>",
    "<BANKTRANLIST>",
    ...transactions.flatMap((transaction) => [
      "<STMTTRN>",
      `<DTPOSTED>${transaction.postedAt ?? "20260725123000"}`,
      `<TRNAMT>${transaction.amount ?? "-42.50"}`,
      `<FITID>${transaction.fitid ?? "FITID-2026-0001"}`,
      ...(transaction.name === undefined ? [] : [`<NAME>${transaction.name}`]),
      ...(transaction.memo === undefined ? [] : [`<MEMO>${transaction.memo}`]),
      "</STMTTRN>",
    ]),
    "</BANKTRANLIST>",
    "</STMTRS>",
    "</STMTTRNRS>",
    "</BANKMSGSRSV1>",
    "</OFX>",
  ].join("\n");
}

function writeStatement(name: string, contents = makeOfx()): string {
  const path = join(baseDir, name);
  writeFileSync(path, contents);
  return path;
}

function account(overrides: Partial<NormalizedAccount> = {}): NormalizedAccount {
  return {
    id: "123456789",
    providerRef: "123456789",
    name: "OFX 123456789",
    type: "checking",
    currency: "cad",
    institution: "815",
    ...overrides,
  };
}

function transaction(overrides: Partial<NormalizedTransaction> = {}): NormalizedTransaction {
  return {
    id: "FITID-2026-0001",
    accountId: "123456789",
    postedAt: "2026-07-25T12:30:00.000Z",
    amount: -42.5,
    currency: "cad",
    description: "Example clean fixture",
    status: "posted",
    providerRef: "FITID-2026-0001",
    ...overrides,
  };
}

describe("OFX snapshot input hardening", () => {
  it("rejects traversal, symlink escape, NUL paths, directories, non-regular files, and non-OFX extensions", () => {
    writeStatement("clean.ofx");
    writeFileSync(join(workspaceDir, "outside.ofx"), makeOfx());
    symlinkSync(join(workspaceDir, "outside.ofx"), join(baseDir, "escape.ofx"));
    mkdirSync(join(baseDir, "directory.ofx"));
    writeFileSync(join(baseDir, "wrong-extension.txt"), makeOfx());

    expect(() => readOfxSnapshot("../outside.ofx", { allowedBaseDir: baseDir })).toThrow(/traversal/i);
    expect(() => readOfxSnapshot("escape.ofx", { allowedBaseDir: baseDir })).toThrow(/symlink/i);
    expect(() => readOfxSnapshot("clean.ofx\0.txt", { allowedBaseDir: baseDir })).toThrow(/NUL/i);
    expect(() => readOfxSnapshot("directory.ofx", { allowedBaseDir: baseDir })).toThrow(/regular/i);
    expect(() => assertRegularOfxFile({ isSymbolicLink: () => false, isFile: () => false })).toThrow(/regular/i);
    expect(() => readOfxSnapshot("wrong-extension.txt", { allowedBaseDir: baseDir })).toThrow(/\.ofx/i);
  });

  it("enforces the byte and transaction caps before submission", () => {
    writeFileSync(join(baseDir, "oversized.ofx"), Buffer.alloc(DEFAULT_OFX_MAX_BYTES + 1));
    const rows = Array.from({ length: DEFAULT_OFX_MAX_TRANSACTIONS + 1 }, (_, index) => ({
      fitid: `FITID-${index}`,
      name: "Clean row",
    }));
    writeStatement("too-many.ofx", makeOfx({ transactions: rows }));

    expect(() => readOfxSnapshot("oversized.ofx", { allowedBaseDir: baseDir })).toThrow(/byte cap/i);
    expect(() => readOfxSnapshot("too-many.ofx", { allowedBaseDir: baseDir })).toThrow(/transaction cap/i);
  });
});

describe("strict OFX source normalization", () => {
  it("rejects missing account id/currency, multiple accounts, malformed amounts/dates, and empty descriptions", () => {
    const valid = makeOfx();
    const withTwoAccounts = valid.replace(
      "</BANKACCTFROM>",
      "</BANKACCTFROM><BANKACCTFROM><BANKID>816<ACCTID>second<ACCTTYPE>CHECKING</BANKACCTFROM>",
    );

    expect(() => parseOfx(valid.replace("<ACCTID>123456789", ""))).toThrow(/ACCTID/);
    expect(() => parseOfx(valid.replace("<CURDEF>CAD", ""))).toThrow(/CURDEF/);
    expect(() => parseOfx(withTwoAccounts)).toThrow(/account section/i);
    expect(() => parseOfx(valid.replace("<TRNAMT>-42.50", "<TRNAMT>-42.500"))).toThrow(/decimal/i);
    expect(() => parseOfx(valid.replace("<DTPOSTED>20260725123000", "<DTPOSTED>20260230123000"))).toThrow(/date/i);
    expect(() => parseOfx(valid.replace("<NAME>Example clean fixture", ""))).toThrow(/description/i);
  });

  it("preserves OFX account and FITID source identifiers without trimming or deriving them", () => {
    const parsed = parseOfx(makeOfx({ accountId: "  account ref  ", transactions: [{
      fitid: "  FITID ref  ",
      name: "Clean description",
    }] }));

    expect(parsed.account.id).toBe("  account ref  ");
    expect(parsed.account.providerRef).toBe("  account ref  ");
    expect(parsed.transactions[0]?.id).toBe("  FITID ref  ");
    expect(parsed.transactions[0]?.providerRef).toBe("  FITID ref  ");
  });
});

describe("OFX-to-banking import mapper", () => {
  it("emits the exact v1 wire shape, omits balance, and canonicalizes currency", () => {
    const prepared = prepareOfxImport({
      account: account(),
      transactions: [transaction()],
    });

    expect(prepared).toEqual({
      body: {
        provider: "ofx-upload",
        account: {
          id: "123456789",
          providerRef: "123456789",
          name: "OFX 123456789",
          type: "checking",
          currency: "CAD",
          institution: "815",
        },
        transactions: [{
          id: "FITID-2026-0001",
          accountId: "123456789",
          postedAt: "2026-07-25T12:30:00.000Z",
          amount: -42.5,
          currency: "CAD",
          description: "Example clean fixture",
          status: "posted",
          providerRef: "FITID-2026-0001",
        }],
      },
      sourceRows: 1,
      pendingOmitted: 0,
      submitted: 1,
    });
  });

  it("sends posted rows only and counts pending rows locally", () => {
    const prepared = prepareOfxImport({
      account: account(),
      transactions: [
        transaction(),
        transaction({ id: "pending-id", providerRef: "pending-ref", status: "pending" }),
      ],
    });

    expect(prepared.sourceRows).toBe(2);
    expect(prepared.pendingOmitted).toBe(1);
    expect(prepared.submitted).toBe(1);
    expect(prepared.body.transactions).toEqual([expect.objectContaining({ status: "posted" })]);
  });

  it("copies ids and refs byte-for-byte and rejects orphan accounts, duplicate FITIDs, and currency mismatch", () => {
    const preserved = prepareOfxImport({
      account: account({ id: " account id ", providerRef: " provider account ref " }),
      transactions: [transaction({
        id: " transaction id ",
        accountId: " account id ",
        providerRef: " provider transaction ref ",
      })],
    });
    expect(preserved.body.account.id).toBe(" account id ");
    expect(preserved.body.account.providerRef).toBe(" provider account ref ");
    expect(preserved.body.transactions[0]?.id).toBe(" transaction id ");
    expect(preserved.body.transactions[0]?.providerRef).toBe(" provider transaction ref ");

    expect(() => prepareOfxImport({ account: account(), transactions: [transaction({ accountId: "orphan" })] })).toThrow(/accountId/i);
    expect(() => prepareOfxImport({
      account: account(),
      transactions: [transaction(), transaction({ id: "another", providerRef: "FITID-2026-0001" })],
    })).toThrow(/duplicated/i);
    expect(() => prepareOfxImport({
      account: account(),
      transactions: [transaction({ currency: "USD" })],
    })).toThrow(/currency/i);
  });

  it("rejects invalid transaction fields before the HTTP handoff", () => {
    expect(() => prepareOfxImport({ account: account({ currency: "C4D" }), transactions: [transaction()] })).toThrow(/currency/i);
    expect(() => prepareOfxImport({ account: account(), transactions: [transaction({ amount: 1.234 })] })).toThrow(/amount/i);
    expect(() => prepareOfxImport({ account: account(), transactions: [transaction({ postedAt: "2026-02-30T12:30:00.000Z" })] })).toThrow(/postedAt/i);
    expect(() => prepareOfxImport({ account: account(), transactions: [transaction({ description: "" })] })).toThrow(/text/i);
  });
});

describe("one-shot OFX CLI", () => {
  it("posts the exact normalized body, excludes tenant controls, and reports an idempotent replay without sensitive output", async () => {
    writeStatement("clean.ofx");
    const stdout: string[] = [];
    const stderr: string[] = [];
    const requests: Array<{ body: unknown; headers: Headers }> = [];
    const importedRefs = new Set<string>();
    const env = {
      BANK_CONNECTOR_OFX_IMPORT_BASE_DIR: baseDir,
      OPENERP_BANK_IMPORT_API_URL: "http://api.example.test",
      OPENERP_BANK_IMPORT_BEARER_TOKEN: "short-lived-test-token",
    };

    const fetchImpl: typeof fetch = async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as {
        account: { id: string };
        transactions: Array<{ providerRef: string }>;
      };
      requests.push({ body, headers: new Headers(init?.headers) });
      const imported = body.transactions.filter((entry) => !importedRefs.has(entry.providerRef));
      for (const entry of imported) importedRefs.add(entry.providerRef);
      return new Response(JSON.stringify({
        imported: imported.map(() => ({ description: "response-only-sensitive-description" })),
        skippedPending: 0,
      }), { status: 200, headers: { "content-type": "application/json" } });
    };

    const dependencies = {
      env,
      fetchImpl,
      stdout: { write: (chunk: string) => { stdout.push(chunk); return true; } },
      stderr: { write: (chunk: string) => { stderr.push(chunk); return true; } },
    };
    expect(await runOfxImportCli(["--file", "clean.ofx"], dependencies)).toBe(0);
    expect(await runOfxImportCli(["--file", "clean.ofx"], dependencies)).toBe(0);

    expect(requests).toHaveLength(2);
    expect(requests[0]?.body).toEqual({
      provider: "ofx-upload",
      account: {
        id: "123456789",
        providerRef: "123456789",
        name: "OFX 123456789",
        type: "checking",
        currency: "CAD",
        institution: "815",
      },
      transactions: [{
        id: "FITID-2026-0001",
        accountId: "123456789",
        postedAt: "2026-07-25T12:30:00.000Z",
        amount: -42.5,
        currency: "CAD",
        description: "Example clean fixture",
        status: "posted",
        providerRef: "FITID-2026-0001",
      }],
    });
    expect(requests[0]?.headers.get("authorization")).toBe("Bearer short-lived-test-token");
    expect(requests[0]?.headers.get("x-organization-id")).toBeNull();
    expect(requests[0]?.headers.get("x-tenant-id")).toBeNull();
    expect(Object.keys(requests[0]?.body as object)).not.toContain("tenant");
    expect(stdout.join("")).toContain('"newlyImported":1');
    expect(stdout.join("")).toContain('"replayNoOps":1');
    expect(stdout.join("")).toContain('"code":"OK"');
    expect(`${stdout.join("")}${stderr.join("")}`).not.toMatch(
      /Example clean fixture|response-only-sensitive-description|short-lived-test-token|clean\.ofx|<OFX>/,
    );
  });

  it("does not accept tenant-like CLI inputs or expose transport errors", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const dependencies = {
      env: {
        BANK_CONNECTOR_OFX_IMPORT_BASE_DIR: baseDir,
        OPENERP_BANK_IMPORT_API_URL: "http://api.example.test",
        OPENERP_BANK_IMPORT_BEARER_TOKEN: "short-lived-test-token",
      },
      fetchImpl: async () => { throw new Error("merchant and /private/statement.ofx must not leak"); },
      stdout: { write: (chunk: string) => { stdout.push(chunk); return true; } },
      stderr: { write: (chunk: string) => { stderr.push(chunk); return true; } },
    };

    expect(await runOfxImportCli(["--org", "org-secret"], dependencies)).toBe(2);
    writeStatement("clean.ofx");
    expect(await runOfxImportCli(["--file", "clean.ofx"], dependencies)).toBe(1);
    expect(`${stdout.join("")}${stderr.join("")}`).toMatch(/USAGE|HTTP_FAILURE/);
    expect(`${stdout.join("")}${stderr.join("")}`).not.toMatch(/org-secret|merchant|private|clean\.ofx|short-lived-test-token/);
  });
});
