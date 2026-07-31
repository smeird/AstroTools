import { checkDatabaseReadiness } from "@/lib/db/readiness";
import { log } from "@/lib/observability/logger";

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
    } catch (error) {
      log("error", {
        event: "readiness_check_failed",
        errorName: error instanceof Error ? error.name : "unknown",
        route: "/api/health/ready",
        status: 503,
      });
      return serviceUnavailable();
    }
  };
}
