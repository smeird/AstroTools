import Link from "next/link";

import { ViewModeToggle } from "./view-mode-toggle";

interface SiteHeaderProps {
  releaseLabel?: string;
}

export function SiteHeader({ releaseLabel = "Release 01" }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link
          className="brand"
          href="/"
          prefetch={false}
          aria-label="Astrotools home"
        >
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          <span>Astrotools</span>
        </Link>
        <div className="site-header-actions">
          <ViewModeToggle />
          <span className="release-tag">{releaseLabel}</span>
        </div>
      </div>
    </header>
  );
}
