import { MILLIMETRES_PER_INCH, millimetresToInches } from "@/lib/calculations";
import type { SamplingAssessment } from "@/lib/calculations";

import type { PhysicalDisplayUnit } from "./equipment-configuration";

export const SAMPLING_ASSESSMENT_LABELS: Readonly<
  Record<SamplingAssessment, string>
> = Object.freeze({
  "likely-undersampled": "Likely undersampled for the stated seeing",
  "broadly-appropriate": "Broadly appropriate for many conditions",
  "likely-oversampled": "Likely oversampled for the stated seeing",
});

export interface NumberFormatOptions {
  readonly minimumFractionDigits?: number;
  readonly maximumFractionDigits?: number;
}

export interface PresentedPhysicalLength {
  readonly value: number;
  readonly numberText: string;
  readonly unitSymbol: "mm" | "in";
  readonly unitName: "millimetres" | "inches";
  readonly text: string;
}

export interface PhysicalUnitDefinition {
  readonly unitSymbol: "mm" | "in";
  readonly unitName: "millimetres" | "inches";
  readonly micrometresPerUnit: 1_000 | 25_400;
}

function normaliseDisplayedZero(value: number, maximumFractionDigits: number) {
  const zeroThreshold = 0.5 * 10 ** -maximumFractionDigits;
  return Object.is(value, -0) || Math.abs(value) < zeroThreshold ? 0 : value;
}

export function formatDecimal(
  value: number,
  {
    minimumFractionDigits = 0,
    maximumFractionDigits = 6,
  }: NumberFormatOptions = {},
): string {
  if (!Number.isFinite(value)) {
    throw new TypeError("Display values must be finite.");
  }

  if (
    !Number.isSafeInteger(minimumFractionDigits) ||
    !Number.isSafeInteger(maximumFractionDigits) ||
    minimumFractionDigits < 0 ||
    maximumFractionDigits < minimumFractionDigits ||
    maximumFractionDigits > 12
  ) {
    throw new RangeError(
      "Fraction digits must be safe integers from 0 through 12.",
    );
  }

  const fixed = normaliseDisplayedZero(value, maximumFractionDigits).toFixed(
    maximumFractionDigits,
  );
  const [integerPart, fractionalPart = ""] = fixed.split(".");
  const retainedFraction = fractionalPart
    .slice(0, maximumFractionDigits)
    .replace(
      new RegExp(
        `0{0,${Math.max(0, maximumFractionDigits - minimumFractionDigits)}}$`,
      ),
      "",
    );

  return retainedFraction.length > 0
    ? `${integerPart}.${retainedFraction}`
    : integerPart!;
}

export function formatRoundTripNumber(value: number): string {
  if (!Number.isFinite(value)) {
    throw new TypeError("Display values must be finite.");
  }

  return String(value);
}

export function physicalUnitDefinition(
  unit: PhysicalDisplayUnit,
): PhysicalUnitDefinition {
  return unit === "millimetres"
    ? {
        unitSymbol: "mm",
        unitName: "millimetres",
        micrometresPerUnit: 1_000,
      }
    : {
        unitSymbol: "in",
        unitName: "inches",
        micrometresPerUnit: 25_400,
      };
}

export function convertMillimetresForDisplay(
  valueMm: number,
  unit: PhysicalDisplayUnit,
): number {
  return unit === "millimetres" ? valueMm : millimetresToInches(valueMm);
}

export function presentPhysicalLength(
  valueMm: number,
  unit: PhysicalDisplayUnit,
  options?: NumberFormatOptions,
): PresentedPhysicalLength {
  const definition = physicalUnitDefinition(unit);
  const value = convertMillimetresForDisplay(valueMm, unit);
  const numberText = formatDecimal(
    value,
    options ?? {
      minimumFractionDigits: unit === "millimetres" ? 2 : 3,
      maximumFractionDigits: unit === "millimetres" ? 2 : 3,
    },
  );

  return {
    value,
    numberText,
    unitSymbol: definition.unitSymbol,
    unitName: definition.unitName,
    text: `${numberText} ${definition.unitSymbol}`,
  };
}

export function imageScaleFocalLengthDenominator(
  effectiveFocalLengthMm: number,
  unit: PhysicalDisplayUnit,
): {
  readonly displayedFocalLength: PresentedPhysicalLength;
  readonly millimetresPerDisplayedUnit: 1 | typeof MILLIMETRES_PER_INCH;
} {
  return {
    displayedFocalLength: presentPhysicalLength(effectiveFocalLengthMm, unit, {
      maximumFractionDigits: 6,
    }),
    millimetresPerDisplayedUnit:
      unit === "millimetres" ? 1 : MILLIMETRES_PER_INCH,
  };
}

export function formatDegrees(valueDeg: number): string {
  return `${formatDecimal(valueDeg, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}°`;
}

export function formatArcminutes(valueDeg: number): string {
  return `${formatDecimal(valueDeg * 60, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}′`;
}
