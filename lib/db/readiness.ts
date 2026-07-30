import { getPrismaClient } from "./client";
import { DATABASE_OPERATION_TIMEOUT_MS } from "./config";

export const READINESS_TIMEOUT_MS = DATABASE_OPERATION_TIMEOUT_MS;

export type ReadinessQuery = () => Promise<unknown>;

export async function runReadinessProbe(
  query: ReadinessQuery,
  timeoutMs: number = READINESS_TIMEOUT_MS,
): Promise<void> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    await Promise.race([
      query(),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(
          () => reject(new Error("Database readiness query timed out.")),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

export async function checkDatabaseReadiness(): Promise<void> {
  await runReadinessProbe(
    // This is a fixed, parameterless health query; no request data reaches SQL.
    () => getPrismaClient().$queryRaw`SELECT 1`,
  );
}
