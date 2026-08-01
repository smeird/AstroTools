import Link from "next/link";

import styles from "./calculator-navigation.module.css";

export function CalculatorNavigation({
  active,
}: {
  active:
    | "field-of-view"
    | "resolution-and-sampling"
    | "modifier-effects"
    | "sensor-tilt"
    | "backfocus-spacing"
    | "guiding-ratio"
    | "equipment";
}) {
  return (
    <nav aria-label="Calculators" className={styles.navigation}>
      <Link
        aria-current={active === "equipment" ? "page" : undefined}
        className={styles.link}
        href="/equipment"
        prefetch={false}
      >
        My Equipment
      </Link>
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
      <Link
        aria-current={active === "sensor-tilt" ? "page" : undefined}
        className={styles.link}
        href="/calculators/sensor-tilt"
        prefetch={false}
      >
        Sensor Tilt
      </Link>
      <Link
        aria-current={active === "backfocus-spacing" ? "page" : undefined}
        className={styles.link}
        href="/calculators/backfocus-spacing"
        prefetch={false}
      >
        Back-focus
      </Link>
      <Link
        aria-current={active === "guiding-ratio" ? "page" : undefined}
        className={styles.link}
        href="/calculators/guiding-ratio"
        prefetch={false}
      >
        Guiding Ratio
      </Link>
    </nav>
  );
}
