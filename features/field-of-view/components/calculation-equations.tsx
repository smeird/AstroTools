"use client";

import { Fragment, type Dispatch } from "react";

import {
  EquationCard,
  MathExpression,
  type EquationVariableDefinition,
} from "@/components/equations";
import { SegmentedControl } from "@/components/design-system";
import {
  IMAGE_SCALE_ARCSECONDS_CONSTANT,
  SAMPLING_THRESHOLDS,
  type CameraSensorInput,
  type ImagingSystemResult,
} from "@/lib/calculations";
import {
  formatArcminutes,
  formatDecimal,
  formatDegrees,
  formatRoundTripNumber,
  imageScaleFocalLengthDenominator,
  physicalUnitDefinition,
  presentPhysicalLength,
  SAMPLING_ASSESSMENT_LABELS,
} from "../model/calculation-presentation";
import type {
  EquipmentConfigurationAction,
  FocalLengthMode,
  PhysicalDisplayUnit,
} from "../model/equipment-configuration";

import styles from "./calculation-equations.module.css";

const DISPLAY_UNIT_OPTIONS = [
  { value: "millimetres", label: "Millimetres (mm)" },
  { value: "inches", label: "Inches (in)" },
] as const;

interface CalculationEquationsProps {
  readonly result: ImagingSystemResult;
  readonly nativeFocalLengthMm: number;
  readonly nativeFocalRatio: number;
  readonly apertureMm: number;
  readonly opticalMultipliers: readonly number[];
  readonly sensor: CameraSensorInput;
  readonly binningFactor: number;
  readonly seeingFwhmArcsec: number;
  readonly focalLengthMode: FocalLengthMode;
  readonly physicalDisplayUnit: PhysicalDisplayUnit;
  readonly dispatch: Dispatch<EquipmentConfigurationAction>;
}

interface SubscriptProps {
  readonly base: string;
  readonly subscript: string;
}

interface EffectiveOpticsEquationsProps {
  readonly result: ImagingSystemResult;
  readonly nativeFocalLengthMm: number;
  readonly nativeFocalRatio: number;
  readonly apertureMm: number;
  readonly opticalMultipliers: readonly number[];
  readonly focalLengthMode: FocalLengthMode;
  readonly unit: PhysicalDisplayUnit;
}

function Subscript({ base, subscript }: SubscriptProps) {
  return (
    <msub>
      <mi>{base}</mi>
      <mi>{subscript}</mi>
    </msub>
  );
}

function PhysicalMathValue({
  valueMm,
  unit,
}: {
  readonly valueMm: number;
  readonly unit: PhysicalDisplayUnit;
}) {
  const presented = presentPhysicalLength(valueMm, unit, {
    maximumFractionDigits: 6,
  });

  return (
    <mrow>
      <mn>{presented.numberText}</mn>
      <mspace width="0.25em" />
      <mtext>{presented.unitSymbol}</mtext>
    </mrow>
  );
}

function ApproximateResult({
  value,
  unit,
  maximumFractionDigits = 6,
}: {
  readonly value: number;
  readonly unit: string;
  readonly maximumFractionDigits?: number;
}) {
  return (
    <>
      <mo>≈</mo>
      <mn>{formatDecimal(value, { maximumFractionDigits })}</mn>
      <mspace width="0.25em" />
      <mtext>{unit}</mtext>
    </>
  );
}

function AccessibleAngularPair({
  horizontalDeg,
  verticalDeg,
}: {
  readonly horizontalDeg: number;
  readonly verticalDeg: number;
}) {
  return (
    <>
      <span aria-hidden="true">
        {formatDegrees(horizontalDeg)} × {formatDegrees(verticalDeg)}
      </span>
      <span className={styles.visuallyHidden}>
        {formatDecimal(horizontalDeg, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}{" "}
        degrees horizontal by{" "}
        {formatDecimal(verticalDeg, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}{" "}
        degrees vertical
      </span>
    </>
  );
}

function AccessibleArcminutePair({
  horizontalDeg,
  verticalDeg,
}: {
  readonly horizontalDeg: number;
  readonly verticalDeg: number;
}) {
  return (
    <>
      <span aria-hidden="true">
        {formatArcminutes(horizontalDeg)} × {formatArcminutes(verticalDeg)}
      </span>
      <span className={styles.visuallyHidden}>
        {formatDecimal(horizontalDeg * 60, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })}{" "}
        arcminutes horizontal by{" "}
        {formatDecimal(verticalDeg * 60, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })}{" "}
        arcminutes vertical
      </span>
    </>
  );
}

function EffectiveOpticsEquations({
  result,
  nativeFocalLengthMm,
  nativeFocalRatio,
  apertureMm,
  opticalMultipliers,
  focalLengthMode,
  unit,
}: EffectiveOpticsEquationsProps) {
  const unitDefinition = physicalUnitDefinition(unit);
  const variables: EquationVariableDefinition[] = [
    {
      symbol: "f_n",
      meaning: "Native telescope focal length",
      unit: unitDefinition.unitName,
    },
    {
      symbol: "f_e",
      meaning: "Effective focal length after every modifier",
      unit: unitDefinition.unitName,
    },
    {
      symbol: "m_i",
      meaning: "Each ordered reducer, flattener, Barlow, or custom factor",
      unit: "dimensionless multiplier",
    },
    {
      symbol: "i, n",
      meaning:
        "Modifier index and total number of factors; an empty product equals one",
      unit: "integer index and count",
    },
    {
      symbol: "D",
      meaning: "Nominal telescope aperture",
      unit: unitDefinition.unitName,
    },
    {
      symbol: "N_e",
      meaning: "Effective focal ratio",
      unit: "dimensionless f-number",
    },
  ];

  if (focalLengthMode === "derived") {
    variables.push({
      symbol: "N_n",
      meaning: "Native focal ratio selected in derived-focal-length mode",
      unit: "dimensionless f-number",
    });
  }

  const effectiveLength = presentPhysicalLength(
    result.effectiveFocalLengthMm,
    unit,
  );

  return (
    <EquationCard
      finalResult={
        <p>
          {effectiveLength.text} effective focal length; f/
          {formatDecimal(result.effectiveFocalRatio, {
            maximumFractionDigits: 2,
          })}
        </p>
      }
      inWords={
        <p>
          Multiply native focal length by every optical factor, then divide the
          effective focal length by aperture to obtain the effective f-number.
        </p>
      }
      interpretation={
        <>
          <p>
            This effective focal length drives both framing and sampling.
            Reducers shorten it and Barlows lengthen it.{" "}
            {focalLengthMode === "derived"
              ? "In derived-focal-length mode, aperture changes the field only because you deliberately coupled it to the native focal ratio."
              : "In direct-focal-length mode, aperture alone does not alter the field."}
          </p>
          <p>
            Achieved spacing can change the actual modifier factor and geometric
            f-number. Obstruction, transmission, and vignetting affect delivered
            light or usable field and are not modelled.
          </p>
        </>
      }
      title="Effective optics"
      variables={variables}
    >
      {focalLengthMode === "derived" ? (
        <>
          <MathExpression label="Derived native focal length — symbolic">
            <mrow>
              <Subscript base="f" subscript="n" />
              <mo>=</mo>
              <mi>D</mi>
              <mo>⁢</mo>
              <Subscript base="N" subscript="n" />
            </mrow>
          </MathExpression>
          <MathExpression label="Derived native focal length — current values">
            <mrow>
              <PhysicalMathValue valueMm={apertureMm} unit={unit} />
              <mo>×</mo>
              <mn>
                {formatDecimal(nativeFocalRatio, {
                  maximumFractionDigits: 6,
                })}
              </mn>
              <mo>≈</mo>
              <PhysicalMathValue valueMm={nativeFocalLengthMm} unit={unit} />
            </mrow>
          </MathExpression>
        </>
      ) : null}

      <MathExpression label="Effective focal length — symbolic">
        <mrow>
          <Subscript base="f" subscript="e" />
          <mo>=</mo>
          <Subscript base="f" subscript="n" />
          <mo>⁢</mo>
          <munderover>
            <mo>∏</mo>
            <mrow>
              <mi>i</mi>
              <mo>=</mo>
              <mn>1</mn>
            </mrow>
            <mi>n</mi>
          </munderover>
          <msub>
            <mi>m</mi>
            <mi>i</mi>
          </msub>
        </mrow>
      </MathExpression>
      <MathExpression label="Effective focal length — current values">
        <mrow>
          <PhysicalMathValue valueMm={nativeFocalLengthMm} unit={unit} />
          {(opticalMultipliers.length > 0 ? opticalMultipliers : [1]).map(
            (multiplier, index) => (
              <Fragment key={`${multiplier}-${index}`}>
                <mo>×</mo>
                <mn>
                  {formatDecimal(multiplier, { maximumFractionDigits: 6 })}
                </mn>
              </Fragment>
            ),
          )}
          <mo>≈</mo>
          <PhysicalMathValue
            valueMm={result.effectiveFocalLengthMm}
            unit={unit}
          />
        </mrow>
      </MathExpression>
      <MathExpression label="Effective focal ratio — symbolic">
        <mrow>
          <Subscript base="N" subscript="e" />
          <mo>=</mo>
          <mfrac>
            <Subscript base="f" subscript="e" />
            <mi>D</mi>
          </mfrac>
        </mrow>
      </MathExpression>
      <MathExpression label="Effective focal ratio — current values">
        <mrow>
          <mfrac>
            <PhysicalMathValue
              valueMm={result.effectiveFocalLengthMm}
              unit={unit}
            />
            <PhysicalMathValue valueMm={apertureMm} unit={unit} />
          </mfrac>
          <mo>≈</mo>
          <mn>
            {formatDecimal(result.effectiveFocalRatio, {
              maximumFractionDigits: 6,
            })}
          </mn>
        </mrow>
      </MathExpression>
    </EquationCard>
  );
}

function SensorGeometryEquations({
  result,
  sensor,
  unit,
}: {
  readonly result: ImagingSystemResult;
  readonly sensor: CameraSensorInput;
  readonly unit: PhysicalDisplayUnit;
}) {
  const unitDefinition = physicalUnitDefinition(unit);
  const width = presentPhysicalLength(result.sensorDimensionsMm.widthMm, unit);
  const height = presentPhysicalLength(
    result.sensorDimensionsMm.heightMm,
    unit,
  );
  const diagonal = presentPhysicalLength(
    result.sensorDimensionsMm.diagonalMm,
    unit,
  );
  const variables: EquationVariableDefinition[] = [
    {
      symbol: "d_x",
      meaning: "Active sensor width",
      unit: unitDefinition.unitName,
    },
    {
      symbol: "d_y",
      meaning: "Active sensor height",
      unit: unitDefinition.unitName,
    },
    {
      symbol: "d_d",
      meaning: "Corner-to-corner sensor diagonal",
      unit: unitDefinition.unitName,
    },
  ];

  if (sensor.geometry.source === "pixel-resolution") {
    variables.push(
      {
        symbol: "p_x, p_y",
        meaning: "Active pixel counts along the sensor axes",
        unit: "native pixels",
      },
      {
        symbol: "s",
        meaning: "Native square-pixel pitch",
        unit: "micrometres per native pixel",
      },
    );
  }

  return (
    <EquationCard
      finalResult={
        <p>
          {width.text} × {height.text}; {diagonal.text} diagonal
        </p>
      }
      inWords={
        sensor.geometry.source === "pixel-resolution" ? (
          <p>
            Multiply each active pixel count by native pixel pitch and convert
            micrometres to {unitDefinition.unitName}; then use Pythagoras for
            the diagonal.
          </p>
        ) : (
          <p>
            Use the supplied active sensor width and height directly, then use
            Pythagoras for the diagonal.
          </p>
        )
      }
      interpretation={
        <p>
          These are active physical sensor extents. Binning or software
          resampling changes output sampling, not sensor size or field of view.
          Pixel-derived dimensions assume square pixels.
        </p>
      }
      title="Sensor geometry"
      variables={variables}
    >
      {sensor.geometry.source === "pixel-resolution" ? (
        <>
          <MathExpression label="Sensor width and height — symbolic">
            <mtable>
              <mtr>
                <mtd>
                  <Subscript base="d" subscript="x" />
                  <mo>=</mo>
                  <mfrac>
                    <mrow>
                      <Subscript base="p" subscript="x" />
                      <mo>⁢</mo>
                      <mi>s</mi>
                    </mrow>
                    <mrow>
                      <mn>{unitDefinition.micrometresPerUnit}</mn>
                      <mspace width="0.25em" />
                      <mtext>µm/{unitDefinition.unitSymbol}</mtext>
                    </mrow>
                  </mfrac>
                </mtd>
              </mtr>
              <mtr>
                <mtd>
                  <Subscript base="d" subscript="y" />
                  <mo>=</mo>
                  <mfrac>
                    <mrow>
                      <Subscript base="p" subscript="y" />
                      <mo>⁢</mo>
                      <mi>s</mi>
                    </mrow>
                    <mrow>
                      <mn>{unitDefinition.micrometresPerUnit}</mn>
                      <mspace width="0.25em" />
                      <mtext>µm/{unitDefinition.unitSymbol}</mtext>
                    </mrow>
                  </mfrac>
                </mtd>
              </mtr>
            </mtable>
          </MathExpression>
          <MathExpression label="Sensor width and height — current values">
            <mtable>
              <mtr>
                <mtd>
                  <Subscript base="d" subscript="x" />
                  <mo>≈</mo>
                  <mfrac>
                    <mrow>
                      <mn>{sensor.geometry.resolutionWidthPx}</mn>
                      <mo>×</mo>
                      <mn>
                        {formatDecimal(sensor.nativePixelSizeUm, {
                          maximumFractionDigits: 6,
                        })}
                      </mn>
                      <mspace width="0.25em" />
                      <mtext>µm</mtext>
                    </mrow>
                    <mrow>
                      <mn>{unitDefinition.micrometresPerUnit}</mn>
                      <mspace width="0.25em" />
                      <mtext>µm/{unitDefinition.unitSymbol}</mtext>
                    </mrow>
                  </mfrac>
                  <mo>≈</mo>
                  <PhysicalMathValue
                    valueMm={result.sensorDimensionsMm.widthMm}
                    unit={unit}
                  />
                </mtd>
              </mtr>
              <mtr>
                <mtd>
                  <Subscript base="d" subscript="y" />
                  <mo>≈</mo>
                  <mfrac>
                    <mrow>
                      <mn>{sensor.geometry.resolutionHeightPx}</mn>
                      <mo>×</mo>
                      <mn>
                        {formatDecimal(sensor.nativePixelSizeUm, {
                          maximumFractionDigits: 6,
                        })}
                      </mn>
                      <mspace width="0.25em" />
                      <mtext>µm</mtext>
                    </mrow>
                    <mrow>
                      <mn>{unitDefinition.micrometresPerUnit}</mn>
                      <mspace width="0.25em" />
                      <mtext>µm/{unitDefinition.unitSymbol}</mtext>
                    </mrow>
                  </mfrac>
                  <mo>≈</mo>
                  <PhysicalMathValue
                    valueMm={result.sensorDimensionsMm.heightMm}
                    unit={unit}
                  />
                </mtd>
              </mtr>
            </mtable>
          </MathExpression>
        </>
      ) : (
        <MathExpression label="Supplied active dimensions — current values">
          <mrow>
            <Subscript base="d" subscript="x" />
            <mo>≈</mo>
            <PhysicalMathValue
              valueMm={result.sensorDimensionsMm.widthMm}
              unit={unit}
            />
            <mo>,</mo>
            <mspace width="0.5em" />
            <Subscript base="d" subscript="y" />
            <mo>≈</mo>
            <PhysicalMathValue
              valueMm={result.sensorDimensionsMm.heightMm}
              unit={unit}
            />
          </mrow>
        </MathExpression>
      )}

      <MathExpression label="Sensor diagonal — symbolic">
        <mrow>
          <Subscript base="d" subscript="d" />
          <mo>=</mo>
          <msqrt>
            <mrow>
              <msup>
                <Subscript base="d" subscript="x" />
                <mn>2</mn>
              </msup>
              <mo>+</mo>
              <msup>
                <Subscript base="d" subscript="y" />
                <mn>2</mn>
              </msup>
            </mrow>
          </msqrt>
        </mrow>
      </MathExpression>
      <MathExpression label="Sensor diagonal — current values">
        <mrow>
          <msqrt>
            <mrow>
              <msup>
                <PhysicalMathValue
                  valueMm={result.sensorDimensionsMm.widthMm}
                  unit={unit}
                />
                <mn>2</mn>
              </msup>
              <mo>+</mo>
              <msup>
                <PhysicalMathValue
                  valueMm={result.sensorDimensionsMm.heightMm}
                  unit={unit}
                />
                <mn>2</mn>
              </msup>
            </mrow>
          </msqrt>
          <mo>≈</mo>
          <PhysicalMathValue
            valueMm={result.sensorDimensionsMm.diagonalMm}
            unit={unit}
          />
        </mrow>
      </MathExpression>
    </EquationCard>
  );
}

type FieldAxis = "x" | "y" | "d";

function FieldOfViewSymbolicRow({ axis }: { readonly axis: FieldAxis }) {
  return (
    <mtr>
      <mtd>
        <Subscript base="θ" subscript={axis} />
        <mo>=</mo>
        <mn>2</mn>
        <mo>⁢</mo>
        <mi>arctan</mi>
        <mo>⁡</mo>
        <mrow>
          <mo>(</mo>
          <mfrac>
            <Subscript base="d" subscript={axis} />
            <mrow>
              <mn>2</mn>
              <mo>⁢</mo>
              <Subscript base="f" subscript="e" />
            </mrow>
          </mfrac>
          <mo>)</mo>
        </mrow>
        <mo>⁢</mo>
        <mfrac>
          <mrow>
            <mn>180</mn>
            <mo>°</mo>
          </mrow>
          <mi>π</mi>
        </mfrac>
      </mtd>
    </mtr>
  );
}

function FieldOfViewSubstitutionRow({
  axis,
  extentMm,
  resultDeg,
  effectiveFocalLengthMm,
  unit,
}: {
  readonly axis: FieldAxis;
  readonly extentMm: number;
  readonly resultDeg: number;
  readonly effectiveFocalLengthMm: number;
  readonly unit: PhysicalDisplayUnit;
}) {
  return (
    <mtr>
      <mtd>
        <Subscript base="θ" subscript={axis} />
        <mo>≈</mo>
        <mn>2</mn>
        <mo>⁢</mo>
        <mi>arctan</mi>
        <mo>⁡</mo>
        <mrow>
          <mo>(</mo>
          <mfrac>
            <PhysicalMathValue valueMm={extentMm} unit={unit} />
            <mrow>
              <mn>2</mn>
              <mo>×</mo>
              <PhysicalMathValue valueMm={effectiveFocalLengthMm} unit={unit} />
            </mrow>
          </mfrac>
          <mo>)</mo>
        </mrow>
        <mo>×</mo>
        <mfrac>
          <mrow>
            <mn>180</mn>
            <mo>°</mo>
          </mrow>
          <mi>π</mi>
        </mfrac>
        <ApproximateResult
          maximumFractionDigits={6}
          unit="°"
          value={resultDeg}
        />
      </mtd>
    </mtr>
  );
}

function FieldOfViewEquations({
  result,
  unit,
}: {
  readonly result: ImagingSystemResult;
  readonly unit: PhysicalDisplayUnit;
}) {
  const { fieldOfViewDeg, sensorDimensionsMm } = result;
  const unitDefinition = physicalUnitDefinition(unit);

  return (
    <EquationCard
      finalResult={
        <div className={styles.angularResults}>
          <p>
            <AccessibleAngularPair
              horizontalDeg={fieldOfViewDeg.horizontalDeg}
              verticalDeg={fieldOfViewDeg.verticalDeg}
            />
          </p>
          <p className={styles.secondaryResult}>
            <AccessibleArcminutePair
              horizontalDeg={fieldOfViewDeg.horizontalDeg}
              verticalDeg={fieldOfViewDeg.verticalDeg}
            />
          </p>
          <p className={styles.diagonalResult}>
            Diagonal:{" "}
            <span aria-hidden="true">
              {formatDegrees(fieldOfViewDeg.diagonalDeg)} ·{" "}
              {formatArcminutes(fieldOfViewDeg.diagonalDeg)}
            </span>
            <span className={styles.visuallyHidden}>
              {formatDecimal(fieldOfViewDeg.diagonalDeg, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              degrees, or{" "}
              {formatDecimal(fieldOfViewDeg.diagonalDeg * 60, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{" "}
              arcminutes
            </span>
          </p>
        </div>
      }
      inWords={
        <p>
          For each sensor axis, divide its physical extent by twice the
          effective focal length, take arctangent, double the angle, and convert
          radians to degrees.
        </p>
      }
      interpretation={
        <>
          <p>
            Horizontal and vertical values are ideal edge-to-edge angular spans;
            diagonal is corner-to-corner. The calculator uses exact arctangent
            geometry within this ideal rectilinear model.
          </p>
          <p>
            Real focal length, active area, distortion, and vignetting can make
            a measured sky footprint differ.
          </p>
        </>
      }
      title="Exact field of view"
      variables={[
        {
          symbol: "θ_x, θ_y, θ_d",
          meaning: "Horizontal, vertical, and diagonal angular fields",
          unit: "degrees, with arcminute equivalents",
        },
        {
          symbol: "d_x, d_y, d_d",
          meaning: "Sensor width, height, and diagonal",
          unit: unitDefinition.unitName,
        },
        {
          symbol: "f_e",
          meaning: "Effective focal length",
          unit: unitDefinition.unitName,
        },
        {
          symbol: "π",
          meaning: "The circle constant pi",
          unit: "dimensionless",
        },
        {
          symbol: "θ, d",
          meaning:
            "Generic angle and sensor extent used only in the educational small-angle approximation",
          unit: `degrees for θ; ${unitDefinition.unitName} for d`,
        },
      ]}
    >
      <MathExpression label="Horizontal, vertical, and diagonal fields — symbolic">
        <mtable>
          <FieldOfViewSymbolicRow axis="x" />
          <FieldOfViewSymbolicRow axis="y" />
          <FieldOfViewSymbolicRow axis="d" />
        </mtable>
      </MathExpression>
      <MathExpression label="Horizontal, vertical, and diagonal fields — current values">
        <mtable>
          <FieldOfViewSubstitutionRow
            axis="x"
            effectiveFocalLengthMm={result.effectiveFocalLengthMm}
            extentMm={sensorDimensionsMm.widthMm}
            resultDeg={fieldOfViewDeg.horizontalDeg}
            unit={unit}
          />
          <FieldOfViewSubstitutionRow
            axis="y"
            effectiveFocalLengthMm={result.effectiveFocalLengthMm}
            extentMm={sensorDimensionsMm.heightMm}
            resultDeg={fieldOfViewDeg.verticalDeg}
            unit={unit}
          />
          <FieldOfViewSubstitutionRow
            axis="d"
            effectiveFocalLengthMm={result.effectiveFocalLengthMm}
            extentMm={sensorDimensionsMm.diagonalMm}
            resultDeg={fieldOfViewDeg.diagonalDeg}
            unit={unit}
          />
        </mtable>
      </MathExpression>
      <MathExpression label="Educational small-angle approximation — not used">
        <mrow>
          <mi>θ</mi>
          <mo>≈</mo>
          <mfrac>
            <mi>d</mi>
            <Subscript base="f" subscript="e" />
          </mfrac>
          <mo>⁢</mo>
          <mfrac>
            <mrow>
              <mn>180</mn>
              <mo>°</mo>
            </mrow>
            <mi>π</mi>
          </mfrac>
        </mrow>
      </MathExpression>
      <p className={styles.approximationNote}>
        The small-angle approximation is shown only for education and is not
        used by the calculator. It increasingly overestimates the field as the
        angle widens.
      </p>
    </EquationCard>
  );
}

function ImageSamplingEquations({
  result,
  sensor,
  binningFactor,
  unit,
}: {
  readonly result: ImagingSystemResult;
  readonly sensor: CameraSensorInput;
  readonly binningFactor: number;
  readonly unit: PhysicalDisplayUnit;
}) {
  const focalLengthDenominator = imageScaleFocalLengthDenominator(
    result.effectiveFocalLengthMm,
    unit,
  );
  const usesInches = unit === "inches";

  return (
    <EquationCard
      finalResult={
        <p>
          {formatDecimal(result.effectivePixelSizeUm, {
            maximumFractionDigits: 4,
          })}{" "}
          µm equivalent output pitch;{" "}
          {formatDecimal(result.imageScaleArcsecPerPixel, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          ″ per output pixel
        </p>
      }
      inWords={
        <p>
          Multiply native pixel pitch by the grouping factor, then apply the
          conventional paraxial plate-scale relation using effective focal
          length.
        </p>
      }
      interpretation={
        <>
          <p>
            Near the optical axis, each output sample represents approximately{" "}
            {formatDecimal(result.imageScaleArcsecPerPixel, {
              maximumFractionDigits: 4,
            })}{" "}
            arcseconds of sky. The rounded constant and ideal geometry make this
            an estimate; calibrated plate scale can vary across a distorted
            field.
          </p>
          <p>
            Hardware binning and post-read software resampling have different
            noise behaviour. Software resampling does not create physically
            larger pixels, and neither operation changes sensor extent.
          </p>
        </>
      }
      title="Image scale"
      variables={[
        {
          symbol: "s",
          meaning: "Native square-pixel pitch",
          unit: "micrometres per native pixel",
        },
        {
          symbol: "b",
          meaning: "Same grouping factor along each axis",
          unit: "dimensionless positive integer",
        },
        {
          symbol: "s_e",
          meaning: "Equivalent output sampling pitch",
          unit: "micrometres per output pixel",
        },
        {
          symbol: "ρ",
          meaning: "Conventional paraxial image scale",
          unit: "arcseconds per output pixel",
        },
        {
          symbol: "206.265",
          meaning:
            "Rounded radians-to-arcseconds factor including the micrometre-to-millimetre conversion",
          unit: "arcsecond millimetres per micrometre",
        },
        {
          symbol: usesInches ? "f_e,in" : "f_e",
          meaning: "Effective focal length",
          unit: usesInches ? "inches" : "millimetres",
        },
        ...(usesInches
          ? [
              {
                symbol: "25.4",
                meaning:
                  "Conversion retained because 206.265 expects focal length in millimetres",
                unit: "millimetres per inch",
              },
            ]
          : []),
      ]}
    >
      <MathExpression label="Equivalent output pitch — symbolic">
        <mrow>
          <Subscript base="s" subscript="e" />
          <mo>=</mo>
          <mi>s</mi>
          <mo>⁢</mo>
          <mi>b</mi>
        </mrow>
      </MathExpression>
      <MathExpression label="Equivalent output pitch — current values">
        <mrow>
          <mn>
            {formatDecimal(sensor.nativePixelSizeUm, {
              maximumFractionDigits: 6,
            })}
          </mn>
          <mspace width="0.25em" />
          <mtext>µm</mtext>
          <mo>×</mo>
          <mn>{binningFactor}</mn>
          <ApproximateResult
            maximumFractionDigits={6}
            unit="µm"
            value={result.effectivePixelSizeUm}
          />
        </mrow>
      </MathExpression>
      <MathExpression label="Image scale — symbolic">
        <mrow>
          <mi>ρ</mi>
          <mo>=</mo>
          <mfrac>
            <mrow>
              <mn>{IMAGE_SCALE_ARCSECONDS_CONSTANT}</mn>
              <mo>⁢</mo>
              <Subscript base="s" subscript="e" />
            </mrow>
            {usesInches ? (
              <mrow>
                <mn>25.4</mn>
                <mo>⁢</mo>
                <msub>
                  <Subscript base="f" subscript="e" />
                  <mtext>in</mtext>
                </msub>
              </mrow>
            ) : (
              <Subscript base="f" subscript="e" />
            )}
          </mfrac>
        </mrow>
      </MathExpression>
      <MathExpression label="Image scale — current values">
        <mrow>
          <mfrac>
            <mrow>
              <mn>{IMAGE_SCALE_ARCSECONDS_CONSTANT}</mn>
              <mo>×</mo>
              <mn>
                {formatDecimal(result.effectivePixelSizeUm, {
                  maximumFractionDigits: 6,
                })}
              </mn>
            </mrow>
            <mrow>
              {usesInches ? (
                <>
                  <mn>{focalLengthDenominator.millimetresPerDisplayedUnit}</mn>
                  <mo>×</mo>
                </>
              ) : null}
              <mn>{focalLengthDenominator.displayedFocalLength.numberText}</mn>
              <mspace width="0.25em" />
              <mtext>
                {focalLengthDenominator.displayedFocalLength.unitSymbol}
              </mtext>
            </mrow>
          </mfrac>
          <ApproximateResult
            maximumFractionDigits={6}
            unit="arcsec/output px"
            value={result.imageScaleArcsecPerPixel}
          />
        </mrow>
      </MathExpression>
    </EquationCard>
  );
}

function SeeingSamplingEquations({
  result,
  seeingFwhmArcsec,
}: {
  readonly result: ImagingSystemResult;
  readonly seeingFwhmArcsec: number;
}) {
  const samplingLabel = SAMPLING_ASSESSMENT_LABELS[result.samplingAssessment];
  const classificationOperand = formatRoundTripNumber(
    result.pixelsPerSeeingFwhm,
  );

  return (
    <EquationCard
      finalResult={
        <>
          <p>
            {formatDecimal(result.pixelsPerSeeingFwhm, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            output pixels per seeing FWHM
          </p>
          <p className={styles.samplingStatus}>{samplingLabel}</p>
        </>
      }
      inWords={
        <p>
          Divide stated atmospheric seeing FWHM by image scale to estimate how
          many output samples span that seeing width.
        </p>
      }
      interpretation={
        <>
          <p>
            The thresholds are explanatory defaults, not universal laws: fewer
            than 2 is likely undersampled, 2 through 4 inclusive is broadly
            appropriate for many conditions, and more than 4 is likely
            oversampled for the stated seeing.
          </p>
          <p>
            Tracking and guiding, focus, diffraction and optics, wavelength,
            exposure, processing method, and target type also affect measured
            stellar width and useful sampling.
          </p>
        </>
      }
      title="Seeing and sampling"
      variables={[
        {
          symbol: "P_FWHM",
          meaning: "Estimated output samples across the seeing FWHM",
          unit: "output pixels per FWHM",
        },
        {
          symbol: "w_seeing",
          meaning: "User-stated atmospheric seeing full width at half maximum",
          unit: "arcseconds",
        },
        {
          symbol: "ρ",
          meaning: "Image scale",
          unit: "arcseconds per output pixel",
        },
      ]}
    >
      <MathExpression label="Pixels per seeing FWHM — symbolic">
        <mrow>
          <msub>
            <mi>P</mi>
            <mtext>FWHM</mtext>
          </msub>
          <mo>=</mo>
          <mfrac>
            <msub>
              <mi>w</mi>
              <mtext>seeing</mtext>
            </msub>
            <mi>ρ</mi>
          </mfrac>
        </mrow>
      </MathExpression>
      <MathExpression label="Pixels per seeing FWHM — current values">
        <mrow>
          <mfrac>
            <mrow>
              <mn>
                {formatDecimal(seeingFwhmArcsec, {
                  maximumFractionDigits: 3,
                })}
              </mn>
              <mo>″</mo>
            </mrow>
            <mrow>
              <mn>
                {formatDecimal(result.imageScaleArcsecPerPixel, {
                  maximumFractionDigits: 6,
                })}
              </mn>
              <mspace width="0.25em" />
              <mtext>arcsec/output px</mtext>
            </mrow>
          </mfrac>
          <ApproximateResult
            maximumFractionDigits={6}
            unit="output px/FWHM"
            value={result.pixelsPerSeeingFwhm}
          />
        </mrow>
      </MathExpression>
      <MathExpression label="Qualified sampling assessment — current values">
        <mrow>
          {result.samplingAssessment === "likely-undersampled" ? (
            <>
              <mn>{classificationOperand}</mn>
              <mo>&lt;</mo>
              <mn>{SAMPLING_THRESHOLDS.appropriateMinimumPixelsPerFwhm}</mn>
            </>
          ) : result.samplingAssessment === "likely-oversampled" ? (
            <>
              <mn>{classificationOperand}</mn>
              <mo>&gt;</mo>
              <mn>{SAMPLING_THRESHOLDS.appropriateMaximumPixelsPerFwhm}</mn>
            </>
          ) : (
            <>
              <mn>{SAMPLING_THRESHOLDS.appropriateMinimumPixelsPerFwhm}</mn>
              <mo>≤</mo>
              <mn>{classificationOperand}</mn>
              <mo>≤</mo>
              <mn>{SAMPLING_THRESHOLDS.appropriateMaximumPixelsPerFwhm}</mn>
            </>
          )}
          <mo>⇒</mo>
          <mtext>{samplingLabel}</mtext>
        </mrow>
      </MathExpression>
      <MathExpression label="Qualified sampling assessment — default thresholds">
        <mtable>
          <mtr>
            <mtd>
              <mtext>Likely undersampled</mtext>
            </mtd>
            <mtd>
              <mtext>if</mtext>
              <mspace width="0.4em" />
              <msub>
                <mi>P</mi>
                <mtext>FWHM</mtext>
              </msub>
              <mo>&lt;</mo>
              <mn>{SAMPLING_THRESHOLDS.appropriateMinimumPixelsPerFwhm}</mn>
            </mtd>
          </mtr>
          <mtr>
            <mtd>
              <mtext>Broadly appropriate</mtext>
            </mtd>
            <mtd>
              <mtext>if</mtext>
              <mspace width="0.4em" />
              <mn>{SAMPLING_THRESHOLDS.appropriateMinimumPixelsPerFwhm}</mn>
              <mo>≤</mo>
              <msub>
                <mi>P</mi>
                <mtext>FWHM</mtext>
              </msub>
              <mo>≤</mo>
              <mn>{SAMPLING_THRESHOLDS.appropriateMaximumPixelsPerFwhm}</mn>
            </mtd>
          </mtr>
          <mtr>
            <mtd>
              <mtext>Likely oversampled</mtext>
            </mtd>
            <mtd>
              <mtext>if</mtext>
              <mspace width="0.4em" />
              <msub>
                <mi>P</mi>
                <mtext>FWHM</mtext>
              </msub>
              <mo>&gt;</mo>
              <mn>{SAMPLING_THRESHOLDS.appropriateMaximumPixelsPerFwhm}</mn>
            </mtd>
          </mtr>
        </mtable>
      </MathExpression>
    </EquationCard>
  );
}

export function CalculationEquations({
  result,
  nativeFocalLengthMm,
  nativeFocalRatio,
  apertureMm,
  opticalMultipliers,
  sensor,
  binningFactor,
  seeingFwhmArcsec,
  focalLengthMode,
  physicalDisplayUnit,
  dispatch,
}: CalculationEquationsProps) {
  return (
    <section
      aria-labelledby="equations-title"
      className={styles.panel}
      data-testid="calculation-equations"
    >
      <div className={styles.header}>
        <div>
          <p className="eyebrow">Show the working</p>
          <h2 id="equations-title">Equations and interpretation</h2>
          <p>
            Symbolic equations, current substitutions, variable definitions,
            rounded results, and the limits of each model.
          </p>
        </div>
        <div className={styles.unitControl}>
          <SegmentedControl
            description="Changes physical result displays and substituted equations only. Canonical inputs and calculations remain in millimetres."
            id="physical-display-units"
            label="Physical display units"
            name="physical-display-units"
            onValueChange={(value) =>
              dispatch({ type: "physical-display-unit", value })
            }
            options={DISPLAY_UNIT_OPTIONS}
            value={physicalDisplayUnit}
          />
        </div>
      </div>

      <div className={styles.grid}>
        <EffectiveOpticsEquations
          apertureMm={apertureMm}
          focalLengthMode={focalLengthMode}
          nativeFocalLengthMm={nativeFocalLengthMm}
          nativeFocalRatio={nativeFocalRatio}
          opticalMultipliers={opticalMultipliers}
          result={result}
          unit={physicalDisplayUnit}
        />
        <SensorGeometryEquations
          result={result}
          sensor={sensor}
          unit={physicalDisplayUnit}
        />
        <FieldOfViewEquations result={result} unit={physicalDisplayUnit} />
        <ImageSamplingEquations
          binningFactor={binningFactor}
          result={result}
          sensor={sensor}
          unit={physicalDisplayUnit}
        />
        <SeeingSamplingEquations
          result={result}
          seeingFwhmArcsec={seeingFwhmArcsec}
        />
      </div>
    </section>
  );
}

export {
  AccessibleAngularPair,
  AccessibleArcminutePair,
  type CalculationEquationsProps,
};
