import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/lib/db/generated/prisma/client";

import { type DatabaseEnvironment, parseDatabaseConfiguration } from "./config";

type PrismaGlobal = typeof globalThis & {
  astrotoolsPrismaClient?: PrismaClient;
};

const prismaGlobal = globalThis as PrismaGlobal;

export function createPrismaClient(
  environment: DatabaseEnvironment = process.env,
): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: parseDatabaseConfiguration(environment),
  });

  return new PrismaClient({ adapter });
}

/** Creates the process-wide client only on first use, never during module load. */
export function getPrismaClient(): PrismaClient {
  prismaGlobal.astrotoolsPrismaClient ??= createPrismaClient();
  return prismaGlobal.astrotoolsPrismaClient;
}

/** Explicitly releases the pool and clears the singleton for test shutdown. */
export async function disconnectPrismaClient(): Promise<void> {
  const client = prismaGlobal.astrotoolsPrismaClient;

  if (!client) {
    return;
  }

  delete prismaGlobal.astrotoolsPrismaClient;
  await client.$disconnect();
}
