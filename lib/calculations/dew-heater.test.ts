import { describe, expect, it } from "vitest";
import { calculateDewHeater } from "./dew-heater";
describe("calculateDewHeater", () => {
  it("uses the Magnus dew point", () => {
    const r = calculateDewHeater({
      ambientTemperatureC: 10,
      relativeHumidityPercent: 80,
      opticDiameterMm: 200,
      heaterBandWidthMm: 40,
      safetyMarginC: 3,
      heatTransferCoefficientWPerM2K: 25,
      efficiencyPercent: 70,
      supplyVoltage: 12,
    });
    expect(r.dewPointC).toBeCloseTo(6.71, 2);
    expect(r.estimatedPowerW).toBe(0);
  });
  it("estimates positive power for a target above ambient", () => {
    const r = calculateDewHeater({
      ambientTemperatureC: 10,
      relativeHumidityPercent: 95,
      opticDiameterMm: 200,
      heaterBandWidthMm: 40,
      safetyMarginC: 4,
      heatTransferCoefficientWPerM2K: 25,
      efficiencyPercent: 70,
      supplyVoltage: 12,
    });
    expect(r.requiredTemperatureLiftC).toBeGreaterThan(0);
    expect(r.estimatedPowerW).toBeGreaterThan(0);
  });
});
