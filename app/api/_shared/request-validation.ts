import { z } from "zod";

const emptyQuerySchema = z.object({}).strict();

export function searchParameterRecord(url: URL): Record<string, string> | null {
  const entries: [string, string][] = [];
  const seen = new Set<string>();

  for (const [key, value] of url.searchParams) {
    if (seen.has(key)) {
      return null;
    }

    seen.add(key);
    entries.push([key, value]);
  }

  return Object.fromEntries(entries);
}

export function hasValidEmptyQuery(request: Request): boolean {
  const parameters = searchParameterRecord(new URL(request.url));
  return parameters !== null && emptyQuerySchema.safeParse(parameters).success;
}
