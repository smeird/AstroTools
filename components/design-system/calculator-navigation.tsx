import Link from "next/link";

import styles from "./calculator-navigation.module.css";

export function CalculatorNavigation({
  active,
}: {
  active: "field-of-view" | "resolution-and-sampling" | "modifier-effects";
}) {
  return (
    <nav aria-label="Calculators" className={styles.navigation}>
      <Link
        aria-current={active === "field-of-view" ? "page" : undefined}
        className={styles.link}
        href="/calculators/field-of-view"
        prefetch={false}
      >
        Field of View
      </Link>
      <Link
        aria-current={active === "modifier-effects" ? "page" : undefined}
        className={styles.link}
        href="/calculators/modifier-effects"
        prefetch={false}
      >
        Reducer &amp; Barlow
      </Link>
      <Link
        aria-current={active === "resolution-and-sampling" ? "page" : undefined}
        className={styles.link}
        href="/calculators/resolution-and-sampling"
        prefetch={false}
      >
        Resolution &amp; Sampling
      </Link>
    </nav>
  );
}
