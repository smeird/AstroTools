import { z } from "zod";

const databaseEnvironmentSchema = z.object({
  DATABASE_URL: z.string().min(1).max(2_048),
});

const DEFAULT_POSTGRESQL_PORT = 5_432;
export const DATABASE_OPERATION_TIMEOUT_MS = 2_000;

export class DatabaseConfigurationError extends Error {
  constructor() {
    super("DATABASE_URL is missing or invalid.");
    this.name = "DatabaseConfigurationError";
  }
}

export type DatabaseEnvironment = Readonly<Record<string, string | undefined>>;

function decodeUrlComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new DatabaseConfigurationError();
  }
}

/** Validates the PostgreSQL URL without allowing its secret into diagnostics. */
export function parseDatabaseConfiguration(
  environment: DatabaseEnvironment,
): string {
  const parsedEnvironment = databaseEnvironmentSchema.safeParse(environment);
  if (!parsedEnvironment.success) throw new DatabaseConfigurationError();

  let databaseUrl: URL;
  try {
    databaseUrl = new URL(parsedEnvironment.data.DATABASE_URL);
  } catch {
    throw new DatabaseConfigurationError();
  }

  const database = decodeUrlComponent(databaseUrl.pathname.slice(1));
  const user = decodeUrlComponent(databaseUrl.username);
  const password = decodeUrlComponent(databaseUrl.password);
  const host = databaseUrl.hostname === "[::1]" ? "::1" : databaseUrl.hostname;
  const port = databaseUrl.port
    ? Number.parseInt(databaseUrl.port, 10)
    : DEFAULT_POSTGRESQL_PORT;

  if (
    databaseUrl.protocol !== "postgresql:" ||
    !["127.0.0.1", "localhost", "::1"].includes(host) ||
    user.length === 0 ||
    user.toLowerCase() === "postgres" ||
    password.length === 0 ||
    database.length === 0 ||
    database.includes("/") ||
    databaseUrl.hash.length > 0 ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65_535
  )
    throw new DatabaseConfigurationError();

  return parsedEnvironment.data.DATABASE_URL;
}

/** Prevents a shadow database from aliasing the primary through host spelling. */
export function databaseUrlsTargetSameDatabase(
  firstUrl: string,
  secondUrl: string,
): boolean {
  parseDatabaseConfiguration({ DATABASE_URL: firstUrl });
  parseDatabaseConfiguration({ DATABASE_URL: secondUrl });
  const first = new URL(firstUrl);
  const second = new URL(secondUrl);
  return (
    (first.port || String(DEFAULT_POSTGRESQL_PORT)) ===
      (second.port || String(DEFAULT_POSTGRESQL_PORT)) &&
    decodeUrlComponent(first.pathname.slice(1)).toLowerCase() ===
      decodeUrlComponent(second.pathname.slice(1)).toLowerCase()
  );
}
