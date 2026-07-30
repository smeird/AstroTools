import { describe, expect, it } from "vitest";

import {
  parseIntegrationRunnerMode,
  resolveIntegrationDatabaseUrls,
  validateIntegrationDatabaseUrl,
} from "./run-integration-tests";

describe("integration database guard", () => {
  it("accepts only the explicit migration-only runner mode", () => {
    expect(parseIntegrationRunnerMode([])).toBe("full");
    expect(parseIntegrationRunnerMode(["--migrate-only"])).toBe("migrate-only");
    expect(() => parseIntegrationRunnerMode(["--unknown"])).toThrow(
      /Unsupported integration test runner argument/,
    );
    expect(() =>
      parseIntegrationRunnerMode(["--migrate-only", "--unknown"]),
    ).toThrow(/Unsupported integration test runner argument/);
  });

  it("accepts a loopback MySQL test database", () => {
    const databaseUrl =
      "mysql://astrotools_app:test-only@127.0.0.1:3306/astrotools_test";

    expect(validateIntegrationDatabaseUrl({ DATABASE_URL: databaseUrl })).toBe(
      databaseUrl,
    );
  });

  it.each([
    [{}, "DATABASE_URL is required"],
    [{ DATABASE_URL: "not a URL" }, "valid URL"],
    [
      { DATABASE_URL: "postgres://app:test@127.0.0.1:5432/astrotools_test" },
      "mysql protocol",
    ],
    [
      { DATABASE_URL: "mysql://app:test@127.0.0.1:3306/astrotools" },
      "distinct 'test' segment",
    ],
    [
      { DATABASE_URL: "mysql://root:test@127.0.0.1:3306/astrotools_test" },
      "non-root identity",
    ],
    [
      { DATABASE_URL: "mysql://app@127.0.0.1:3306/astrotools_test" },
      "non-root identity",
    ],
    [
      { DATABASE_URL: "mysql://app:test@db.internal:3306/astrotools_test" },
      "non-loopback integration database",
    ],
    [
      {
        DATABASE_URL: "mysql://app:test@127.0.0.1:3306/astrotools_test",
        NODE_ENV: "production",
      },
      "NODE_ENV=production",
    ],
  ])("rejects unsafe configuration %#", (environment, message) => {
    expect(() => validateIntegrationDatabaseUrl(environment)).toThrow(message);
  });

  it("rejects a remote test database even when a legacy opt-in is present", () => {
    const databaseUrl =
      "mysql://astrotools_app:test-only@db.internal:3306/astrotools_test";

    expect(() =>
      validateIntegrationDatabaseUrl({
        ASTROTOOLS_ALLOW_REMOTE_TEST_DATABASE: "1",
        DATABASE_URL: databaseUrl,
      }),
    ).toThrow(/non-loopback integration database/);
  });

  it("accepts the bracketed IPv6 loopback hostname returned by URL parsing", () => {
    const databaseUrl =
      "mysql://astrotools_app:test-only@[::1]:3306/astrotools_test";

    expect(validateIntegrationDatabaseUrl({ DATABASE_URL: databaseUrl })).toBe(
      databaseUrl,
    );
  });

  it("keeps separate runtime and migration identities on the same test database", () => {
    expect(
      resolveIntegrationDatabaseUrls({
        DATABASE_URL:
          "mysql://astrotools_app:runtime@127.0.0.1:3306/astrotools_test",
        MIGRATION_DATABASE_URL:
          "mysql://astrotools_migrate:migrate@127.0.0.1:3306/astrotools_test",
      }),
    ).toEqual({
      runtimeDatabaseUrl:
        "mysql://astrotools_app:runtime@127.0.0.1:3306/astrotools_test",
      migrationDatabaseUrl:
        "mysql://astrotools_migrate:migrate@127.0.0.1:3306/astrotools_test",
    });
  });

  it("rejects migration credentials for a different database", () => {
    expect(() =>
      resolveIntegrationDatabaseUrls({
        DATABASE_URL:
          "mysql://astrotools_app:runtime@127.0.0.1:3306/astrotools_test",
        MIGRATION_DATABASE_URL:
          "mysql://astrotools_migrate:migrate@127.0.0.1:3306/other_test",
      }),
    ).toThrow(/same test database/);
  });

  it("requires a distinct migration identity", () => {
    expect(() =>
      resolveIntegrationDatabaseUrls({
        DATABASE_URL:
          "mysql://astrotools_app:runtime@127.0.0.1:3306/astrotools_test",
      }),
    ).toThrow(/MIGRATION_DATABASE_URL is required/);

    expect(() =>
      resolveIntegrationDatabaseUrls({
        DATABASE_URL:
          "mysql://astrotools_app:runtime@127.0.0.1:3306/astrotools_test",
        MIGRATION_DATABASE_URL:
          "mysql://astrotools_app:migrate@127.0.0.1:3306/astrotools_test",
      }),
    ).toThrow(/distinct identities/);
  });
});
