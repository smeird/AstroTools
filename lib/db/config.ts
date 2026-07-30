import type { PoolConfig } from "mariadb";
import { z } from "zod";

const databaseEnvironmentSchema = z.object({
  DATABASE_URL: z.string().min(1).max(2_048),
});

const DEFAULT_MYSQL_PORT = 3_306;
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

/**
 * Converts the single database secret into a bounded driver configuration.
 * Errors deliberately omit the URL so credentials can never enter logs.
 */
export function parseDatabaseConfiguration(
  environment: DatabaseEnvironment,
): PoolConfig {
  const parsedEnvironment = databaseEnvironmentSchema.safeParse(environment);

  if (!parsedEnvironment.success) {
    throw new DatabaseConfigurationError();
  }

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
  const isLoopback = ["127.0.0.1", "localhost", "::1"].includes(host);
  const port = databaseUrl.port
    ? Number.parseInt(databaseUrl.port, 10)
    : DEFAULT_MYSQL_PORT;

  if (
    databaseUrl.protocol !== "mysql:" ||
    host.length === 0 ||
    !isLoopback ||
    user.length === 0 ||
    user.toLowerCase() === "root" ||
    password.length === 0 ||
    database.length === 0 ||
    database.includes("/") ||
    databaseUrl.search.length > 0 ||
    databaseUrl.hash.length > 0 ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65_535
  ) {
    throw new DatabaseConfigurationError();
  }

  return {
    host,
    port,
    user,
    password,
    database,
    connectionLimit: 10,
    minimumIdle: 1,
    acquireTimeout: DATABASE_OPERATION_TIMEOUT_MS,
    connectTimeout: DATABASE_OPERATION_TIMEOUT_MS,
    idleTimeout: 60,
    initializationTimeout: DATABASE_OPERATION_TIMEOUT_MS,
    // MySQL applies this millisecond limit to read-only SELECT statements. An
    // init command is used instead of mariadb's queryTimeout option, which is
    // unsupported by MySQL, and is reapplied after pooled connection resets.
    initSql: `SET SESSION max_execution_time=${DATABASE_OPERATION_TIMEOUT_MS}`,
  };
}

/**
 * Conservatively treats every accepted loopback spelling as the same host so a
 * Prisma shadow database cannot alias its primary database through URL
 * encoding or an equivalent localhost name.
 */
export function databaseUrlsTargetSameDatabase(
  firstUrl: string,
  secondUrl: string,
): boolean {
  const first = parseDatabaseConfiguration({ DATABASE_URL: firstUrl });
  const second = parseDatabaseConfiguration({ DATABASE_URL: secondUrl });

  return (
    first.port === second.port &&
    first.database?.toLowerCase() === second.database?.toLowerCase()
  );
}
