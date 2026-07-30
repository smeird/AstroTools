import { describe, expect, it } from "vitest";

import {
  databaseUrlsTargetSameDatabase,
  DatabaseConfigurationError,
  parseDatabaseConfiguration,
} from "./config";

describe("parseDatabaseConfiguration", () => {
  it("creates a bounded pool configuration from a valid MySQL URL", () => {
    expect(
      parseDatabaseConfiguration({
        DATABASE_URL:
          "mysql://astrotools%5Fapp:safe%20password@127.0.0.1:3307/astrotools",
      }),
    ).toEqual({
      host: "127.0.0.1",
      port: 3307,
      user: "astrotools_app",
      password: "safe password",
      database: "astrotools",
      connectionLimit: 10,
      minimumIdle: 1,
      acquireTimeout: 2_000,
      connectTimeout: 2_000,
      idleTimeout: 60,
      initializationTimeout: 2_000,
      initSql: "SET SESSION max_execution_time=2000",
    });
  });

  it.each([
    undefined,
    "",
    "not a url",
    "postgresql://user:password@localhost/astrotools",
    "mysql://user@localhost/astrotools",
    "mysql://user:password@localhost/",
    "mysql://user:password@localhost/astrotools?debug=true",
    "mysql://root:password@localhost/astrotools",
    "mysql://user:password@db.internal/astrotools",
  ])(
    "rejects unsafe or incomplete configuration without echoing it: %s",
    (url) => {
      const secret = url ?? "missing-value";

      expect(() =>
        parseDatabaseConfiguration(
          url === undefined ? {} : { DATABASE_URL: url },
        ),
      ).toThrow(DatabaseConfigurationError);

      try {
        parseDatabaseConfiguration(
          url === undefined ? {} : { DATABASE_URL: url },
        );
      } catch (error) {
        if (secret.length > 0) {
          expect(String(error)).not.toContain(secret);
        }
      }
    },
  );

  it("normalizes an IPv6 loopback host for the driver", () => {
    expect(
      parseDatabaseConfiguration({
        DATABASE_URL: "mysql://user:password@[::1]:3306/astrotools",
      }).host,
    ).toBe("::1");
  });

  it("recognizes equivalent loopback and encoded database targets", () => {
    expect(
      databaseUrlsTargetSameDatabase(
        "mysql://owner:password@127.0.0.1:3306/astrotools%5Fdev",
        "mysql://owner:password@localhost/ASTROTOOLS_DEV",
      ),
    ).toBe(true);
    expect(
      databaseUrlsTargetSameDatabase(
        "mysql://owner:password@127.0.0.1:3306/astrotools_dev",
        "mysql://owner:password@[::1]:3306/astrotools_shadow",
      ),
    ).toBe(false);
    expect(
      databaseUrlsTargetSameDatabase(
        "mysql://owner:password@127.0.0.1:3306/astrotools_dev",
        "mysql://owner:password@127.0.0.1:3307/astrotools_dev",
      ),
    ).toBe(false);
  });
});
