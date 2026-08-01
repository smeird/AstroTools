export interface BackfocusSpacingInput {
  readonly nominalBackfocusMm: number;
  readonly cameraDepthMm: number;
  readonly filterWheelDepthMm: number;
  readonly guiderDepthMm: number;
  readonly otherAdaptersMm: number;
  readonly installedSpacerMm: number;
  readonly filterThicknessMm: number;
  readonly filterRefractiveIndex: number;
}

export interface BackfocusSpacingResult {
  readonly fixedTrainLengthMm: number;
  readonly installedTrainLengthMm: number;
  readonly filterFocusAllowanceMm: number;
  readonly correctedTargetMm: number;
  readonly requiredSpacerMm: number;
  readonly spacingErrorMm: number;
  readonly adjustmentMm: number;
  readonly status: "short" | "within-tolerance" | "long";
}

function finiteNonNegative(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0)
    throw new RangeError(`${name} must be a finite non-negative number`);
}

export function calculateBackfocusSpacing(
  input: BackfocusSpacingInput,
): BackfocusSpacingResult {
  finiteNonNegative("nominalBackfocusMm", input.nominalBackfocusMm);
  finiteNonNegative("cameraDepthMm", input.cameraDepthMm);
  finiteNonNegative("filterWheelDepthMm", input.filterWheelDepthMm);
  finiteNonNegative("guiderDepthMm", input.guiderDepthMm);
  finiteNonNegative("otherAdaptersMm", input.otherAdaptersMm);
  finiteNonNegative("installedSpacerMm", input.installedSpacerMm);
  finiteNonNegative("filterThicknessMm", input.filterThicknessMm);
  if (
    !Number.isFinite(input.filterRefractiveIndex) ||
    input.filterRefractiveIndex <= 1
  )
    throw new RangeError("filterRefractiveIndex must be greater than one");

  const fixedTrainLengthMm =
    input.cameraDepthMm +
    input.filterWheelDepthMm +
    input.guiderDepthMm +
    input.otherAdaptersMm;
  const installedTrainLengthMm = fixedTrainLengthMm + input.installedSpacerMm;
  const filterFocusAllowanceMm =
    input.filterThicknessMm * (1 - 1 / input.filterRefractiveIndex);
  const correctedTargetMm = input.nominalBackfocusMm + filterFocusAllowanceMm;
  const requiredSpacerMm = correctedTargetMm - fixedTrainLengthMm;
  const spacingErrorMm = installedTrainLengthMm - correctedTargetMm;
  const adjustmentMm = -spacingErrorMm;
  const toleranceMm = 0.1;

  return {
    fixedTrainLengthMm,
    installedTrainLengthMm,
    filterFocusAllowanceMm,
    correctedTargetMm,
    requiredSpacerMm,
    spacingErrorMm,
    adjustmentMm,
    status:
      Math.abs(spacingErrorMm) <= toleranceMm
        ? "within-tolerance"
        : spacingErrorMm < 0
          ? "short"
          : "long",
  };
}
