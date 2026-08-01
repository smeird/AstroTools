export interface DewHeaterInput {
  ambientTemperatureC: number;
  relativeHumidityPercent: number;
  opticDiameterMm: number;
  heaterBandWidthMm: number;
  safetyMarginC: number;
  heatTransferCoefficientWPerM2K: number;
  efficiencyPercent: number;
  supplyVoltage: number;
}
export interface DewHeaterResult {
  dewPointC: number;
  ambientDewMarginC: number;
  targetTemperatureC: number;
  requiredTemperatureLiftC: number;
  heatedAreaM2: number;
  estimatedPowerW: number;
  estimatedCurrentA: number;
  risk: "condensation-likely" | "narrow-margin" | "comfortable-margin";
}
export function calculateDewHeater(i: DewHeaterInput): DewHeaterResult {
  if (
    !Number.isFinite(i.ambientTemperatureC) ||
    i.ambientTemperatureC < -80 ||
    i.ambientTemperatureC > 80
  )
    throw new RangeError("ambient temperature out of range");
  if (
    !Number.isFinite(i.relativeHumidityPercent) ||
    i.relativeHumidityPercent <= 0 ||
    i.relativeHumidityPercent > 100
  )
    throw new RangeError("humidity out of range");
  for (const [n, v] of Object.entries(i).slice(2))
    if (!Number.isFinite(v) || v <= 0)
      throw new RangeError(`${n} must be positive`);
  if (i.efficiencyPercent > 100)
    throw new RangeError("efficiency must not exceed 100");
  const a = 17.62,
    b = 243.12,
    gamma =
      Math.log(i.relativeHumidityPercent / 100) +
      (a * i.ambientTemperatureC) / (b + i.ambientTemperatureC),
    dewPointC = (b * gamma) / (a - gamma),
    ambientDewMarginC = i.ambientTemperatureC - dewPointC,
    targetTemperatureC = Math.max(
      i.ambientTemperatureC,
      dewPointC + i.safetyMarginC,
    ),
    requiredTemperatureLiftC = targetTemperatureC - i.ambientTemperatureC,
    heatedAreaM2 =
      Math.PI * (i.opticDiameterMm / 1000) * (i.heaterBandWidthMm / 1000),
    estimatedPowerW =
      (i.heatTransferCoefficientWPerM2K *
        heatedAreaM2 *
        requiredTemperatureLiftC) /
      (i.efficiencyPercent / 100);
  return {
    dewPointC,
    ambientDewMarginC,
    targetTemperatureC,
    requiredTemperatureLiftC,
    heatedAreaM2,
    estimatedPowerW,
    estimatedCurrentA: estimatedPowerW / i.supplyVoltage,
    risk:
      ambientDewMarginC <= 0
        ? "condensation-likely"
        : ambientDewMarginC < 3
          ? "narrow-margin"
          : "comfortable-margin",
  };
}
