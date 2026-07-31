"use client";

import { useEffect } from "react";

import { log } from "@/lib/observability/logger";

export default function ErrorBoundary({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  useEffect(() => {
    log("error", { event: "route_error", errorName: error.name });
  }, [error]);

  return (
    <main>
      <section aria-labelledby="application-error-title">
        <p className="eyebrow">Astrotools</p>
        <h1 id="application-error-title">We could not load this page.</h1>
        <p>
          Your equipment and calculator settings have not been sent anywhere.
          Please try again.
        </p>
        <button onClick={reset} type="button">
          Try again
        </button>
      </section>
    </main>
  );
}
