import type { z } from "zod";

import { getCatalogueService } from "@/features/field-of-view/services/catalogue";
import { log } from "@/lib/observability/logger";
import type {
  CatalogueService,
  PaginatedResult,
} from "@/features/field-of-view/services/catalogue-types";

import {
  catalogueSuccess,
  internalError,
  invalidRequest,
  notFound,
} from "./responses";
import {
  hasValidEmptyQuery,
  searchParameterRecord,
} from "./request-validation";

export type CatalogueServiceProvider = () => CatalogueService;

export interface DetailRouteContext {
  params: Promise<{ slug: string }>;
}

export function createCatalogueListHandler<TQuery, TItem>(
  schema: z.ZodType<TQuery>,
  load: (
    service: CatalogueService,
    query: TQuery,
  ) => Promise<PaginatedResult<TItem>>,
  getService: CatalogueServiceProvider = getCatalogueService,
) {
  return async function GET(request: Request): Promise<Response> {
    const parameters = searchParameterRecord(new URL(request.url));

    if (!parameters) {
      return invalidRequest();
    }

    const query = schema.safeParse(parameters);

    if (!query.success) {
      return invalidRequest();
    }

    try {
      const result = await load(getService(), query.data);
      return catalogueSuccess(result.items, result.pagination);
    } catch (error) {
      log("error", {
        event: "catalogue_list_failed",
        errorName: error instanceof Error ? error.name : "unknown",
        status: 500,
      });
      return internalError();
    }
  };
}

export function createCatalogueDetailHandler<TItem>(
  slugSchema: z.ZodType<string>,
  load: (service: CatalogueService, slug: string) => Promise<TItem | null>,
  getService: CatalogueServiceProvider = getCatalogueService,
) {
  return async function GET(
    request: Request,
    context: DetailRouteContext,
  ): Promise<Response> {
    if (!hasValidEmptyQuery(request)) {
      return invalidRequest();
    }

    let routeParameters: { slug: string };

    try {
      routeParameters = await context.params;
    } catch (error) {
      log("error", {
        event: "catalogue_detail_failed",
        errorName: error instanceof Error ? error.name : "unknown",
        status: 500,
      });
      return internalError();
    }

    const slug = slugSchema.safeParse(routeParameters.slug);

    if (!slug.success) {
      return invalidRequest();
    }

    try {
      const result = await load(getService(), slug.data);
      return result ? catalogueSuccess(result) : notFound();
    } catch (error) {
      log("error", {
        event: "catalogue_detail_failed",
        errorName: error instanceof Error ? error.name : "unknown",
        status: 500,
      });
      return internalError();
    }
  };
}
