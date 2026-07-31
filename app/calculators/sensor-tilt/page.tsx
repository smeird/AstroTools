import type { Metadata } from "next";

import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { SkipLink } from "@/components/design-system/skip-link";
import { SensorTiltCalculator } from "@/features/sensor-tilt/components/sensor-tilt-calculator";

export const metadata: Metadata = { title: "Sensor Tilt Calculator" };

export default function SensorTiltPage() {
  return (
    <>
      <SkipLink />
      <SiteHeader releaseLabel="Sensor Tilt · Release 04" />
      <SensorTiltCalculator />
      <SiteFooter />
    </>
  );
}
