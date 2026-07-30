import { checkDatabaseReadiness } from "@/lib/db/readiness";

import { healthSuccess, invalidRequest, serviceUnavailable } from "./responses";
import { hasValidEmptyQuery } from "./request-validation";

export type ReadinessCheck = () => Promise<void>;

export function createReadinessHandler(
  checkReadiness: ReadinessCheck = checkDatabaseReadiness,
) {
  return async function GET(request: Request): Promise<Response> {
    if (!hasValidEmptyQuery(request)) {
      return invalidRequest();
    }

    try {
      await checkReadiness();
      return healthSuccess({ status: "ready" });
    } catch {
      return serviceUnavailable();
    }
  };
}
