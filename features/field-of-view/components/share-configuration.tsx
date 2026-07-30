"use client";

import { useMemo, useState } from "react";

import type { EquipmentConfigurationState } from "../model/equipment-configuration";
import {
  FIELD_OF_VIEW_SHARE_PATH,
  serializeFieldOfViewShareState,
} from "../schemas/shareable-state";

import styles from "./share-configuration.module.css";

type CopyState = "idle" | "copied" | "failed" | "invalid";

interface CopyFeedback {
  readonly state: CopyState;
  readonly attempt: number;
}

const COPY_MESSAGES: Record<CopyState, string> = {
  idle: "",
  copied: "Link copied. It includes the current configuration.",
  failed: "Could not copy the link. Select and copy it below.",
  invalid: "Complete the labelled required fields before copying a link.",
};

export function ShareConfiguration({
  state,
}: {
  state: EquipmentConfigurationState;
}) {
  const query = useMemo(
    () => serializeFieldOfViewShareState(state)?.toString() ?? null,
    [state],
  );
  return <ShareConfigurationAction key={query ?? "invalid"} query={query} />;
}

function ShareConfigurationAction({ query }: { query: string | null }) {
  const [feedback, setFeedback] = useState<CopyFeedback>({
    state: "idle",
    attempt: 0,
  });
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

  function announce(state: CopyState) {
    setFeedback(({ attempt }) => ({ state, attempt: attempt + 1 }));
  }

  async function copyLink() {
    if (!query) {
      setFallbackUrl(null);
      announce("invalid");
      return;
    }

    const url = new URL(FIELD_OF_VIEW_SHARE_PATH, window.location.origin);
    url.search = query;
    try {
      window.history.replaceState(
        window.history.state,
        "",
        url.pathname + url.search,
      );
    } catch {
      // Address-bar synchronisation is helpful but must not prevent copying.
    }

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(url.href);
      setFallbackUrl(null);
      announce("copied");
    } catch {
      setFallbackUrl(url.href);
      announce("failed");
    }
  }

  return (
    <div className={styles.share}>
      <div>
        <p className={styles.label}>Share this setup</p>
        <p className={styles.description} id="share-configuration-description">
          Creates a versioned link containing only the current calculator
          settings. No account or database write is required.
        </p>
      </div>
      <button
        aria-describedby="share-configuration-description share-configuration-status"
        className={styles.button}
        id="copy-configuration-link"
        onClick={copyLink}
        type="button"
      >
        Copy link
      </button>
      <p
        aria-atomic="true"
        aria-live="polite"
        className={styles.status}
        id="share-configuration-status"
        role="status"
      >
        <span key={feedback.attempt}>{COPY_MESSAGES[feedback.state]}</span>
      </p>
      {fallbackUrl ? (
        <div className={styles.fallback}>
          <label htmlFor="share-configuration-url">Configuration link</label>
          <input
            id="share-configuration-url"
            onFocus={(event) => event.currentTarget.select()}
            readOnly
            type="url"
            value={fallbackUrl}
          />
        </div>
      ) : null}
    </div>
  );
}
