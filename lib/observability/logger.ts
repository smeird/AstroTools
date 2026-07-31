export type LogLevel = "error" | "info" | "warn";

export interface SafeLogContext {
  correlationId?: string;
  event: string;
  method?: string;
  route?: string;
  status?: number;
  durationMs?: number;
  errorName?: string;
}

function sanitizeContext(context: SafeLogContext): SafeLogContext {
  return Object.fromEntries(
    Object.entries(context).filter(([, value]) => value !== undefined),
  ) as SafeLogContext;
}

/** Logs structured operational events without accepting request bodies or secrets. */
export function log(level: LogLevel, context: SafeLogContext): void {
  const payload = JSON.stringify(sanitizeContext(context));

  if (level === "error") {
    console.error(payload);
    return;
  }

  if (level === "warn") {
    console.warn(payload);
    return;
  }

  console.info(payload);
}
