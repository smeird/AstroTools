"use client";

import { useEffect } from "react";

import { log } from "@/lib/observability/logger";

export default function GlobalError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  useEffect(() => {
    log("error", { event: "global_error", errorName: error.name });
  }, [error]);

  return (
    <html lang="en-GB">
      <body>
        <main>
          <h1>Astrotools is temporarily unavailable.</h1>
          <p>Please try again shortly.</p>
          <button onClick={reset} type="button">
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
