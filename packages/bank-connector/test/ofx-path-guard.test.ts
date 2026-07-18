import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createOfxUploadProvider, resolveOfxPath } from "../src/providers/ofx-upload.js";

let baseDir: string;

beforeAll(() => {
  baseDir = mkdtempSync(join(tmpdir(), "ofx-guard-"));
  writeFileSync(join(baseDir, "stmt.ofx"), "<OFX><BANKACCTFROM><ACCTID>1<CURDEF>CAD</OFX>");
});

afterAll(() => {
  rmSync(baseDir, { recursive: true, force: true });
});

describe("resolveOfxPath (path-traversal guard)", () => {
  it("accepts a file inside the allowed base dir", () => {
    expect(resolveOfxPath("stmt.ofx", baseDir)).toBe(join(baseDir, "stmt.ofx"));
  });

  it("rejects ../ traversal out of the base dir", () => {
    expect(() => resolveOfxPath("../escape.ofx", baseDir)).toThrow(/escapes/);
  });

  it("rejects an absolute path outside the base dir", () => {
    expect(() => resolveOfxPath("/etc/passwd", baseDir)).toThrow(/escapes/);
  });

  it("rejects a NUL byte", () => {
    expect(() => resolveOfxPath("stmt.ofx\0.txt", baseDir)).toThrow(/NUL/);
  });
});

describe("createOfxUploadProvider enforces the guard", () => {
  it("refuses to read a file outside allowedBaseDir", async () => {
    const provider = createOfxUploadProvider({ allowedBaseDir: baseDir });
    await expect(
      provider.listTransactions({ filePath: "../../etc/hosts" }, {})
    ).rejects.toThrow(/escapes/);
  });
});
