import "dotenv/config";

import { defineConfig } from "prisma/config";

import {
  databaseUrlsTargetSameDatabase,
  parseDatabaseConfiguration,
} from "./lib/db/config";

const generationOnlyUrl =
  "postgresql://astrotools_generate:NOT_A_REAL_PASSWORD@127.0.0.1:5432/astrotools";

const databaseUrl =
  process.env.MIGRATION_DATABASE_URL ??
  process.env.DATABASE_URL ??
  generationOnlyUrl;
const shadowDatabaseUrl = process.env.SHADOW_DATABASE_URL;

// Prisma CLI commands use this configuration without the runtime adapter, so
// enforce the same accepted loopback, non-root URL policy here as well.
parseDatabaseConfiguration({ DATABASE_URL: databaseUrl });

if (shadowDatabaseUrl) {
  parseDatabaseConfiguration({ DATABASE_URL: shadowDatabaseUrl });

  if (databaseUrlsTargetSameDatabase(databaseUrl, shadowDatabaseUrl)) {
    throw new Error(
      "SHADOW_DATABASE_URL must target a separate development database.",
    );
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl,
    ...(shadowDatabaseUrl ? { shadowDatabaseUrl } : {}),
  },
});
