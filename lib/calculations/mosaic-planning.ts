import { calculateExactFieldOfView } from "./engine";

export interface MosaicPlanningInput {
  readonly effectiveFocalLengthMm: number;
  readonly sensorWidthMm: number;
  readonly sensorHeightMm: number;
  readonly targetWidthDeg: number;
  readonly targetHeightDeg: number;
  readonly overlapPercent: number;
  readonly hoursPerPanel: number;
}

export interface MosaicPlanningResult {
  readonly panelWidthDeg: number;
  readonly panelHeightDeg: number;
  readonly columns: number;
  readonly rows: number;
  readonly panelCount: number;
  readonly achievedWidthDeg: number;
  readonly achievedHeightDeg: number;
  readonly horizontalMarginDeg: number;
  readonly verticalMarginDeg: number;
  readonly horizontalOverlapDeg: number;
  readonly verticalOverlapDeg: number;
  readonly totalIntegrationHours: number;
}

const positive = (name: string, value: number) => {
  if (!Number.isFinite(value) || value <= 0)
    throw new RangeError(`${name} must be positive`);
};

export function calculateMosaicPlanning(
  input: MosaicPlanningInput,
): MosaicPlanningResult {
  positive("effectiveFocalLengthMm", input.effectiveFocalLengthMm);
  positive("sensorWidthMm", input.sensorWidthMm);
  positive("sensorHeightMm", input.sensorHeightMm);
  positive("targetWidthDeg", input.targetWidthDeg);
  positive("targetHeightDeg", input.targetHeightDeg);
  positive("hoursPerPanel", input.hoursPerPanel);
  if (
    !Number.isFinite(input.overlapPercent) ||
    input.overlapPercent < 0 ||
    input.overlapPercent >= 100
  )
    throw new RangeError("overlapPercent must be from 0 to less than 100");

  const field = calculateExactFieldOfView({
    effectiveFocalLengthMm: input.effectiveFocalLengthMm,
    sensorWidthMm: input.sensorWidthMm,
    sensorHeightMm: input.sensorHeightMm,
  });
  const panelWidthDeg = field.horizontalDeg;
  const panelHeightDeg = field.verticalDeg;
  const overlap = input.overlapPercent / 100;
  const count = (target: number, panel: number) =>
    Math.max(1, Math.ceil(1 + (target - panel) / (panel * (1 - overlap))));
  const columns = count(input.targetWidthDeg, panelWidthDeg);
  const rows = count(input.targetHeightDeg, panelHeightDeg);
  const achievedWidthDeg = panelWidthDeg * (1 + (columns - 1) * (1 - overlap));
  const achievedHeightDeg = panelHeightDeg * (1 + (rows - 1) * (1 - overlap));

  return {
    panelWidthDeg,
    panelHeightDeg,
    columns,
    rows,
    panelCount: columns * rows,
    achievedWidthDeg,
    achievedHeightDeg,
    horizontalMarginDeg: (achievedWidthDeg - input.targetWidthDeg) / 2,
    verticalMarginDeg: (achievedHeightDeg - input.targetHeightDeg) / 2,
    horizontalOverlapDeg: panelWidthDeg * overlap,
    verticalOverlapDeg: panelHeightDeg * overlap,
    totalIntegrationHours: columns * rows * input.hoursPerPanel,
  };
}
