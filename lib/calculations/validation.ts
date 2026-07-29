export class CalculationInputError extends RangeError {
  readonly parameter: string;

  constructor(parameter: string, reason: string) {
    super(`${parameter} ${reason}.`);
    this.name = "CalculationInputError";
    this.parameter = parameter;
  }
}

export function requireFiniteNumber(value: number, parameter: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new CalculationInputError(parameter, "must be a finite number");
  }

  return value;
}

export function requirePositiveFiniteNumber(
  value: number,
  parameter: string,
): number {
  requireFiniteNumber(value, parameter);

  if (value <= 0) {
    throw new CalculationInputError(
      parameter,
      "must be a finite number greater than zero",
    );
  }

  return value;
}

export function requirePositiveSafeInteger(
  value: number,
  parameter: string,
): number {
  requirePositiveFiniteNumber(value, parameter);

  if (!Number.isSafeInteger(value)) {
    throw new CalculationInputError(
      parameter,
      "must be a positive safe integer",
    );
  }

  return value;
}

export function requirePositiveFiniteResult(
  value: number,
  calculation: string,
): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new CalculationInputError(
      calculation,
      "exceeds JavaScript Number precision for the supplied inputs",
    );
  }

  return value;
}
