import { healthSuccess, invalidRequest } from "../../_shared/responses";
import { hasValidEmptyQuery } from "../../_shared/request-validation";

export function GET(request: Request): Response {
  if (!hasValidEmptyQuery(request)) {
    return invalidRequest();
  }

  return healthSuccess({ status: "ok" });
}
