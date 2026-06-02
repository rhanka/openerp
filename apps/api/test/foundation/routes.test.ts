import { describe, expect, it } from "vitest";

import { readApiEnv } from "../../src/config/env";
import { permissionDenied, validationError } from "../../src/http/errors";
import { buildFoundationRoutes } from "../../src/http/routes/foundation";
import { describeApi } from "../../src/server";

describe("foundation route registry", () => {
  it("registers required MVP endpoints", () => {
    expect(buildFoundationRoutes().map((route) => `${route.method} ${route.path}`)).toEqual([
      "GET /me",
      "GET /organizations/current",
      "PATCH /organizations/current/settings",
      "GET /users",
      "POST /users/invitations",
      "PATCH /users/:id",
      "GET /roles",
      "POST /roles",
      "PATCH /roles/:id",
      "GET /permissions/effective",
      "GET /audit-events",
      "POST /files",
      "GET /files/:id",
      "POST /comments",
      "GET /notifications",
      "PATCH /notifications/:id",
      "GET /i18n/catalog",
      "GET /system/update-state",
      "POST /auth/exchange-agent-token"
    ]);
  });

  it("marks mutating governance routes as audited", () => {
    expect(
      buildFoundationRoutes()
        .filter((route) => route.audited)
        .map((route) => `${route.method} ${route.path}`)
    ).toEqual([
      "PATCH /organizations/current/settings",
      "POST /users/invitations",
      "PATCH /users/:id",
      "POST /roles",
      "PATCH /roles/:id",
      "POST /files",
      "POST /auth/exchange-agent-token"
    ]);
  });
});

describe("foundation api errors", () => {
  it("uses stable machine codes and i18n message keys", () => {
    expect(permissionDenied()).toEqual({
      code: "permission_denied",
      messageKey: "error.permissionDenied"
    });

    expect(validationError({ field: "email" })).toEqual({
      code: "validation_error",
      messageKey: "error.validation",
      details: { field: "email" }
    });
  });
});

describe("api server descriptor", () => {
  it("describes the API with foundation routes", () => {
    expect(describeApi()).toEqual({
      name: "OpenERP API",
      routes: buildFoundationRoutes()
    });
  });
});

describe("api environment", () => {
  it("reads required environment values with a development app version fallback", () => {
    expect(
      readApiEnv({
        DATABASE_URL: "postgres://example",
        SESSION_SECRET: "secret"
      })
    ).toEqual({
      databaseUrl: "postgres://example",
      sessionSecret: "secret",
      appVersion: "0.0.0-dev"
    });
  });

  it("rejects missing required environment values", () => {
    expect(() => readApiEnv({ SESSION_SECRET: "secret" })).toThrow("DATABASE_URL is required");
    expect(() => readApiEnv({ DATABASE_URL: "postgres://example" })).toThrow("SESSION_SECRET is required");
  });
});
