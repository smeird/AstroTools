"use client";

import { startTransition, useEffect, useState } from "react";

const VIEW_MODE_KEY = "astrotools.view-mode.v1";
type ViewMode = "presentation" | "academic";

function applyMode(mode: ViewMode) {
  document.documentElement.dataset.viewMode = mode;
  document.documentElement.style.colorScheme =
    mode === "academic" ? "light" : "dark";
  let theme = document.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"][data-astrotools-view-mode]',
  );
  if (!theme) {
    theme = document.createElement("meta");
    theme.name = "theme-color";
    theme.dataset.astrotoolsViewMode = "true";
    document.head.append(theme);
  }
  theme.content = mode === "academic" ? "#ffffff" : "#081019";
}

export function ViewModeToggle() {
  const [mode, setMode] = useState<ViewMode>("presentation");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(VIEW_MODE_KEY);
    const restored: ViewMode =
      stored === "academic" ? "academic" : "presentation";
    applyMode(restored);
    startTransition(() => {
      setMode(restored);
      setLoaded(true);
    });
  }, []);

  function toggle() {
    const next = mode === "academic" ? "presentation" : "academic";
    setMode(next);
    applyMode(next);
    window.localStorage.setItem(VIEW_MODE_KEY, next);
  }

  return (
    <button
      aria-label={`Switch to ${mode === "academic" ? "presentation" : "academic"} view`}
      aria-pressed={mode === "academic"}
      className="view-mode-toggle"
      data-loaded={loaded ? "true" : "false"}
      onClick={toggle}
      type="button"
    >
      <span aria-hidden="true">{mode === "academic" ? "§" : "Aa"}</span>
      {mode === "academic" ? "Academic" : "Presentation"}
    </button>
  );
}
