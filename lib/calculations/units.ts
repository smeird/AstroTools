import { MILLIMETRES_PER_INCH } from "./constants";
import { CalculationInputError, requireFiniteNumber } from "./validation";

function requireRepresentableConversion(
  result: number,
  original: number,
  resultUnit: string,
): number {
  if (!Number.isFinite(result) || (original !== 0 && result === 0)) {
    throw new CalculationInputError(
      resultUnit,
      "exceeds JavaScript Number precision for the supplied value",
    );
  }

  return result;
}

export function millimetresToInches(millimetresInput: number): number {
  const millimetres = requireFiniteNumber(millimetresInput, "millimetres");

  return requireRepresentableConversion(
    millimetres / MILLIMETRES_PER_INCH,
    millimetres,
    "inches",
  );
}

export function inchesToMillimetres(inchesInput: number): number {
  const inches = requireFiniteNumber(inchesInput, "inches");

  return requireRepresentableConversion(
    inches * MILLIMETRES_PER_INCH,
    inches,
    "millimetres",
  );
}
