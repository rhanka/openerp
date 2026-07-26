import { describe, expect, it } from "vitest";

import { buildOpenApiDocument } from "../../src/http/openapi";
import { buildBankingRoutes } from "../../src/http/routes/banking";

describe("banking routes and OpenAPI", () => {
  it("registers the durable import, worklist, suggestions, refresh, and reversible stored-link and ignore transitions", () => {
    expect(buildBankingRoutes().map((route) => `${route.method} ${route.path}`)).toEqual([
      "POST /banking/import",
      "GET /banking/transactions",
      "GET /banking/reconciliation/suggestions",
      "POST /banking/reconciliation/refresh",
      "POST /banking/reconciliation/:linkId/confirm",
      "POST /banking/reconciliation/:linkId/reject",
      "POST /banking/reconciliation/:linkId/unmatch",
      "POST /banking/transactions/:id/ignore",
      "POST /banking/transactions/:id/unignore"
    ]);
  });

  it("documents real banking schemas, 200 transitions, and the banking module tag", () => {
    const doc = buildOpenApiDocument();
    expect(doc.tags).toContainEqual(expect.objectContaining({ name: "banking" }));
    expect(doc.paths["/banking/import"]?.post?.responses["200"]).toBeDefined();
    expect(doc.paths["/banking/import"]?.post?.responses["409"]).toBeDefined();
    expect(doc.paths["/banking/reconciliation/{linkId}/confirm"]?.post?.responses["200"]).toBeDefined();
    expect(doc.paths["/banking/reconciliation/{linkId}/confirm"]?.post?.requestBody).toBeUndefined();
    expect(doc.paths["/banking/reconciliation/suggestions"]?.get?.parameters).toContainEqual(
      expect.objectContaining({ name: "status", in: "query", schema: { type: "string", enum: ["proposed", "confirmed", "rejected"] } })
    );
    expect(doc.paths["/banking/transactions/{id}/unignore"]?.post?.responses["200"]).toBeDefined();
    expect(doc.paths["/banking/transactions/{id}/unignore"]?.post?.responses["400"]).toBeDefined();
    expect(doc.paths["/banking/transactions/{id}/unignore"]?.post?.responses["404"]).toBeDefined();
    expect(doc.paths["/banking/transactions/{id}/unignore"]?.post?.responses["409"]).toBeDefined();
    expect(doc.paths["/banking/transactions/{id}/unignore"]?.post?.requestBody).toBeUndefined();
    expect(doc.paths["/banking/transactions"]?.get?.parameters).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "status", in: "query", schema: { type: "string", enum: ["unmatched", "matched", "ignored"] } }),
      expect.objectContaining({ name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 200 } }),
      expect.objectContaining({ name: "offset", in: "query", schema: { type: "integer", minimum: 0 } })
    ]));
    expect(doc.components.schemas.BankingImportInput).toBeDefined();
    expect(doc.components.schemas.BankTransaction).toBeDefined();
    expect(doc.components.schemas.ReconciliationLink).toBeDefined();
  });
});
