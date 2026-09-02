import { describe, expect, it } from "vitest";

import {
  databaseUrlsTargetSameDatabase,
  DatabaseConfigurationError,
  parseDatabaseConfiguration,
} from "./config";

describe("parseDatabaseConfiguration", () => {
  it("returns a valid PostgreSQL URL unchanged", () => {
    expect(
      parseDatabaseConfiguration({
        DATABASE_URL:
          "postgresql://astrotools%5Fapp:safe%20password@127.0.0.1:5433/astrotools",
      }),
    ).toBe(
      "postgresql://astrotools%5Fapp:safe%20password@127.0.0.1:5433/astrotools",
    );
  });

  it.each([
    undefined,
    "",
    "not a url",
    "mysql://user:password@localhost/astrotools",
    "postgresql://user@localhost/astrotools",
    "postgresql://user:password@localhost/",
    "postgresql://postgres:password@localhost/astrotools",
    "postgresql://user:password@db.internal/astrotools",
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

  it("accepts an IPv6 loopback host", () => {
    expect(
      parseDatabaseConfiguration({
        DATABASE_URL: "postgresql://user:password@[::1]:5432/astrotools",
      }),
    ).toBe("postgresql://user:password@[::1]:5432/astrotools");
  });

  it("recognizes equivalent loopback and encoded database targets", () => {
    expect(
      databaseUrlsTargetSameDatabase(
        "postgresql://owner:password@127.0.0.1:5432/astrotools%5Fdev",
        "postgresql://owner:password@localhost/ASTROTOOLS_DEV",
      ),
    ).toBe(true);
    expect(
      databaseUrlsTargetSameDatabase(
        "postgresql://owner:password@127.0.0.1:5432/astrotools_dev",
        "postgresql://owner:password@[::1]:5432/astrotools_shadow",
      ),
    ).toBe(false);
    expect(
      databaseUrlsTargetSameDatabase(
        "postgresql://owner:password@127.0.0.1:5432/astrotools_dev",
        "postgresql://owner:password@127.0.0.1:5433/astrotools_dev",
      ),
    ).toBe(false);
  });
});
