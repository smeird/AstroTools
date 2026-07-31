import Link from "next/link";

import styles from "./calculator-navigation.module.css";

export function CalculatorNavigation({
  active,
}: {
  active:
    | "field-of-view"
    | "resolution-and-sampling"
    | "modifier-effects"
    | "sensor-tilt";
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
      <Link
        aria-current={active === "sensor-tilt" ? "page" : undefined}
        className={styles.link}
        href="/calculators/sensor-tilt"
        prefetch={false}
      >
        Sensor Tilt
      </Link>
    </nav>
  );
}
