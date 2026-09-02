import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { config as loadEnvironment } from "dotenv";

export function validateIntegrationDatabaseUrl(
  environment: Readonly<Record<string, string | undefined>>,
): string {
  const databaseUrl = environment.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required. Integration tests only run against an explicit test database.",
    );
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    throw new Error("Integration DATABASE_URL must be a valid URL.");
  }

  let databaseName: string;
  let databaseUser: string;

  try {
    databaseName = decodeURIComponent(parsedUrl.pathname.slice(1));
    databaseUser = decodeURIComponent(parsedUrl.username);
  } catch {
    throw new Error("Integration DATABASE_URL contains invalid encoding.");
  }

  const isLoopback = ["127.0.0.1", "localhost", "::1", "[::1]"].includes(
    parsedUrl.hostname,
  );
  if (parsedUrl.protocol !== "postgresql:") {
    throw new Error(
      "Integration DATABASE_URL must use the postgresql protocol.",
    );
  }

  if (
    databaseUser.length === 0 ||
    parsedUrl.password.length === 0 ||
    databaseUser.toLowerCase() === "root"
  ) {
    throw new Error(
      "Integration DATABASE_URL must use an explicit non-root identity with a password.",
    );
  }

  if (
    databaseName.includes("/") ||
    !/(^|[_-])test($|[_-])/i.test(databaseName)
  ) {
    throw new Error(
      "Refusing to run integration tests: the database name must contain a distinct 'test' segment.",
    );
  }

  if (!isLoopback) {
    throw new Error("Refusing to use a non-loopback integration database.");
  }

  if (environment.NODE_ENV === "production") {
    throw new Error(
      "Integration tests must never run with NODE_ENV=production.",
    );
  }

  return databaseUrl;
}

interface IntegrationDatabaseUrls {
  runtimeDatabaseUrl: string;
  migrationDatabaseUrl: string;
}

type IntegrationRunnerMode = "full" | "migrate-only";

export function parseIntegrationRunnerMode(
  arguments_: readonly string[],
): IntegrationRunnerMode {
  if (arguments_.length === 0) {
    return "full";
  }

  if (arguments_.length === 1 && arguments_[0] === "--migrate-only") {
    return "migrate-only";
  }

  throw new Error("Unsupported integration test runner argument.");
}

function databaseTarget(databaseUrl: string): string {
  const parsedUrl = new URL(databaseUrl);
  const port = parsedUrl.port || "5432";
  return `${parsedUrl.hostname.toLowerCase()}:${port}/${decodeURIComponent(
    parsedUrl.pathname.slice(1),
  )}`;
}

export function resolveIntegrationDatabaseUrls(
  environment: Readonly<Record<string, string | undefined>>,
): IntegrationDatabaseUrls {
  const runtimeDatabaseUrl = validateIntegrationDatabaseUrl(environment);
  const migrationCandidate = environment.MIGRATION_DATABASE_URL;

  if (!migrationCandidate) {
    throw new Error(
      "MIGRATION_DATABASE_URL is required for the isolated integration database.",
    );
  }

  const migrationDatabaseUrl = validateIntegrationDatabaseUrl({
    ...environment,
    DATABASE_URL: migrationCandidate,
  });

  if (
    databaseTarget(runtimeDatabaseUrl) !== databaseTarget(migrationDatabaseUrl)
  ) {
    throw new Error(
      "Runtime and migration integration URLs must target the same test database.",
    );
  }

  if (
    decodeURIComponent(new URL(runtimeDatabaseUrl).username).toLowerCase() ===
    decodeURIComponent(new URL(migrationDatabaseUrl).username).toLowerCase()
  ) {
    throw new Error(
      "Runtime and migration integration URLs must use distinct identities.",
    );
  }

  return { runtimeDatabaseUrl, migrationDatabaseUrl };
}

function run(command: string, args: string[], environment: NodeJS.ProcessEnv) {
  const result = spawnSync(command, args, {
    env: environment,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function main() {
  // Local credentials live in this gitignored file; explicit shell/CI values
  // retain precedence. A missing file is expected in CI and needs no warning.
  loadEnvironment({
    path: ".env.integration",
    override: false,
    quiet: true,
  });

  const mode = parseIntegrationRunnerMode(process.argv.slice(2));
  const { runtimeDatabaseUrl, migrationDatabaseUrl } =
    resolveIntegrationDatabaseUrls(process.env);
  const testEnvironment: NodeJS.ProcessEnv = {
    ...process.env,
    DATABASE_URL: runtimeDatabaseUrl,
    MIGRATION_DATABASE_URL: migrationDatabaseUrl,
    NODE_ENV: "test",
  };

  run("npm", ["run", "db:generate"], testEnvironment);
  run("npm", ["run", "db:migrate:deploy"], testEnvironment);

  if (mode === "migrate-only") {
    return;
  }

  run("npm", ["run", "db:seed"], testEnvironment);
  run("npm", ["run", "db:seed"], testEnvironment);
  run(
    "npm",
    ["exec", "--", "vitest", "run", "--config", "vitest.integration.config.ts"],
    testEnvironment,
  );
}

const entrypoint = process.argv[1];

if (entrypoint && import.meta.url === pathToFileURL(entrypoint).href) {
  main();
}
