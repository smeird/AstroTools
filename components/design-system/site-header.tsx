import Link from "next/link";

import { ViewModeToggle } from "./view-mode-toggle";
import { AstrotoolsLogo } from "./astrotools-logo";

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
          <AstrotoolsLogo />
          <span>Astrotools</span>
        </Link>
        <div className="site-header-actions">
          <Link className="header-search-link" href="/find" prefetch={false}>
            Find a calculation
          </Link>
          <ViewModeToggle />
          <span className="release-tag">{releaseLabel}</span>
        </div>
      </div>
    </header>
  );
}
