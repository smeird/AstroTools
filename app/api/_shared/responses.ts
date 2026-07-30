export const API_VERSION = "v1";
export const CATALOGUE_CACHE_CONTROL =
  "public, s-maxage=3600, stale-while-revalidate=86400";
export const NO_STORE_CACHE_CONTROL = "no-store";

interface PublicError {
  code: string;
  message: string;
}

function jsonResponse(
  body: unknown,
  options: { status: number; cacheControl: string },
): Response {
  return Response.json(body, {
    status: options.status,
    headers: { "Cache-Control": options.cacheControl },
  });
}

export function catalogueSuccess(data: unknown, meta?: unknown): Response {
  return jsonResponse(
    {
      apiVersion: API_VERSION,
      data,
      ...(meta === undefined ? {} : { meta }),
    },
    { status: 200, cacheControl: CATALOGUE_CACHE_CONTROL },
  );
}

export function healthSuccess(data: unknown): Response {
  return jsonResponse(
    { apiVersion: API_VERSION, data },
    { status: 200, cacheControl: NO_STORE_CACHE_CONTROL },
  );
}

export function publicError(status: number, error: PublicError): Response {
  return jsonResponse(
    { apiVersion: API_VERSION, error },
    { status, cacheControl: NO_STORE_CACHE_CONTROL },
  );
}

export function invalidRequest(): Response {
  return publicError(400, {
    code: "INVALID_REQUEST",
    message: "The request parameters are invalid.",
  });
}

export function notFound(): Response {
  return publicError(404, {
    code: "CATALOGUE_ITEM_NOT_FOUND",
    message: "The requested catalogue item was not found.",
  });
}

export function internalError(): Response {
  return publicError(500, {
    code: "INTERNAL_ERROR",
    message: "The request could not be completed.",
  });
}

export function serviceUnavailable(): Response {
  return publicError(503, {
    code: "SERVICE_UNAVAILABLE",
    message: "The service is not ready.",
  });
}
