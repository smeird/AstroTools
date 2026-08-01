import styles from "./calculator-line-diagram.module.css";

export type CalculatorDiagramKind =
  | "field-of-view"
  | "modifier-effects"
  | "resolution-sampling"
  | "sensor-tilt"
  | "backfocus-spacing"
  | "guiding-ratio"
  | "polar-alignment"
  | "exposure-snr"
  | "mosaic-planning"
  | "dew-heater"
  | "storage-volume"
  | "optimal-sub-exposure"
  | "integration-planner"
  | "filter-exposure-planner"
  | "star-saturation"
  | "guiding-exposure"
  | "plate-solving-scale"
  | "imaging-window"
  | "atmospheric-extinction"
  | "calibration-frames"
  | "drizzle-planner"
  | "field-rotation"
  | "autofocus-planning";

const copy: Record<
  CalculatorDiagramKind,
  { title: string; description: string }
> = {
  "field-of-view": {
    title: "Field geometry",
    description:
      "Focal length projects the sensor rectangle onto an angular field of sky.",
  },
  "modifier-effects": {
    title: "Focal transformation",
    description:
      "The ordered optical multiplier changes the converging cone before it reaches the sensor.",
  },
  "resolution-sampling": {
    title: "Diffraction and sampling",
    description:
      "The atmospheric and diffraction spot is sampled by the camera pixel grid.",
  },
  "sensor-tilt": {
    title: "Sensor plane tilt",
    description:
      "Focus offsets across the sensor describe the angle between the ideal and measured planes.",
  },
  "backfocus-spacing": {
    title: "Mechanical back-focus stack",
    description:
      "Adapters, filter hardware and camera depth fill the distance from reference shoulder to sensor.",
  },
  "guiding-ratio": {
    title: "Imaging and guiding scales",
    description:
      "Two optical systems sample the same tracking motion at different angular scales.",
  },
  "polar-alignment": {
    title: "Polar drift geometry",
    description:
      "Alignment error produces a measurable signed drift over elapsed time.",
  },
  "exposure-snr": {
    title: "Signal and noise accumulation",
    description:
      "Source electrons add linearly while independent noise terms combine in quadrature.",
  },
  "mosaic-planning": {
    title: "Mosaic overlap grid",
    description:
      "Overlapping sensor fields tile the target extent without leaving coverage gaps.",
  },
  "dew-heater": {
    title: "Dew-control geometry",
    description:
      "A heater band raises the optic above dew point while heat is lost to the environment.",
  },
  "storage-volume": {
    title: "Capture data flow",
    description:
      "Pixel dimensions and bit depth determine each frame before frames accumulate into a session total.",
  },
  "optimal-sub-exposure": {
    title: "Exposure envelope",
    description:
      "The useful exposure lies after the background-noise threshold and before the saturation ceiling.",
  },
  "integration-planner": {
    title: "Integration accumulation",
    description:
      "Accepted sub-exposures accumulate into total integration while a rejection allowance increases capture time.",
  },
  "filter-exposure-planner": {
    title: "Channel time allocation",
    description:
      "A fixed integration budget is divided among channels according to priority and relative transmission.",
  },
  "star-saturation": {
    title: "Pixel-well filling",
    description:
      "A bright-star peak fills the finite pixel well until the reserved highlight headroom is reached.",
  },
  "guiding-exposure": {
    title: "Guide cadence envelope",
    description:
      "Guide-star signal must become measurable before uncorrected mount motion exceeds the allowed distance.",
  },
  "plate-solving-scale": {
    title: "Solver search geometry",
    description:
      "Pixel pitch and focal length set image scale, field dimensions and a bounded scale search interval.",
  },
  "imaging-window": {
    title: "Altitude and darkness window",
    description:
      "The usable imaging interval is the overlap between target altitude and astronomical darkness.",
  },
  "atmospheric-extinction": {
    title: "Atmospheric light path",
    description:
      "Lower target altitude lengthens the atmospheric path and reduces received transmission.",
  },
  "calibration-frames": {
    title: "Master-frame combination",
    description:
      "Independent calibration frames combine into lower-noise master dark, flat and bias references.",
  },
  "drizzle-planner": {
    title: "Dithered sampling grid",
    description:
      "Sub-pixel dithers distribute measurements across a finer drizzle output grid.",
  },
  "field-rotation": {
    title: "Rotating field edge",
    description:
      "Field rotation moves stars farther at the frame edge and imposes an exposure-time ceiling.",
  },
  "autofocus-planning": {
    title: "Focus-curve sampling",
    description:
      "A sequence of focuser positions samples both sides of best focus across the critical focus zone.",
  },
};

function Diagram({ kind }: { kind: CalculatorDiagramKind }) {
  switch (kind) {
    case "field-of-view":
      return (
        <>
          <circle cx="72" cy="75" r="32" />
          <path d="M104 55 L440 26 M104 95 L440 124 M104 55 L440 124 M104 95 L440 26" />
          <rect x="440" y="26" width="112" height="98" />
          <line x1="72" y1="75" x2="552" y2="75" />
          <text x="48" y="125">
            optic
          </text>
          <text x="464" y="145">
            sensor / field
          </text>
        </>
      );
    case "modifier-effects":
      return (
        <>
          <path d="M30 35 L248 62 M30 115 L248 88 M300 67 L560 46 M300 83 L560 104" />
          <circle cx="274" cy="75" r="28" />
          <line x1="274" y1="35" x2="274" y2="115" />
          <rect x="560" y="40" width="18" height="70" />
          <text x="218" y="135">
            multiplier m
          </text>
          <text x="522" y="128">
            sensor
          </text>
        </>
      );
    case "resolution-sampling":
      return (
        <>
          <circle cx="120" cy="75" r="34" />
          <circle cx="120" cy="75" r="18" />
          <path d="M154 75 H300" />
          <g>
            {[0, 1, 2, 3, 4].map((x) => (
              <line
                key={x}
                x1={340 + x * 42}
                y1="32"
                x2={340 + x * 42}
                y2="118"
              />
            ))}
            {[0, 1, 2].map((y) => (
              <line
                key={y}
                x1="340"
                y1={32 + y * 43}
                x2="508"
                y2={32 + y * 43}
              />
            ))}
          </g>
          <circle cx="424" cy="75" r="28" />
          <text x="62" y="130">
            seeing / Airy spot
          </text>
          <text x="374" y="140">
            pixel grid
          </text>
        </>
      );
    case "sensor-tilt":
      return (
        <>
          <line x1="60" y1="75" x2="570" y2="75" />
          <rect x="400" y="30" width="16" height="90" />
          <path d="M470 25 L510 125" />
          <path d="M430 45 L474 37 M430 105 L501 104" />
          <text x="354" y="140">
            ideal plane
          </text>
          <text x="476" y="140">
            measured plane
          </text>
        </>
      );
    case "backfocus-spacing":
      return (
        <>
          <line x1="40" y1="75" x2="590" y2="75" />
          <path d="M48 30 V120 M580 30 V120" />
          <rect x="100" y="52" width="90" height="46" />
          <rect x="200" y="44" width="100" height="62" />
          <rect x="310" y="55" width="70" height="40" />
          <rect x="390" y="48" width="110" height="54" />
          <path d="M48 128 H580" />
          <text x="36" y="22">
            shoulder
          </text>
          <text x="548" y="22">
            sensor
          </text>
          <text x="242" y="145">
            component depths + spacer
          </text>
        </>
      );
    case "guiding-ratio":
      return (
        <>
          <path d="M42 35 H280 L340 58 H570 M42 112 H200 L340 92 H570" />
          <circle cx="280" cy="47" r="20" />
          <circle cx="200" cy="102" r="14" />
          <rect x="570" y="48" width="18" height="54" />
          <text x="52" y="25">
            imaging scale
          </text>
          <text x="52" y="137">
            guide scale
          </text>
          <text x="500" y="125">
            same motion
          </text>
        </>
      );
    case "polar-alignment":
      return (
        <>
          <circle cx="165" cy="75" r="52" />
          <line x1="165" y1="75" x2="165" y2="12" />
          <line x1="165" y1="75" x2="205" y2="22" />
          <path d="M165 18 Q188 18 202 31" />
          <path d="M260 75 H560" />
          <path d="M300 75 C360 35 430 115 520 60" />
          <text x="110" y="145">
            axis error
          </text>
          <text x="350" y="145">
            signed drift over time
          </text>
        </>
      );
    case "exposure-snr":
      return (
        <>
          <g>
            {[0, 1, 2, 3].map((i) => (
              <rect
                key={i}
                x={42 + i * 74}
                y={42 - i * 4}
                width="58"
                height="66"
              />
            ))}
          </g>
          <path d="M340 75 H425" />
          <rect x="425" y="28" width="140" height="94" />
          <path d="M442 96 L470 70 L494 82 L524 48 L550 62" />
          <text x="48" y="132">
            N calibrated frames
          </text>
          <text x="438" y="142">
            stacked signal
          </text>
        </>
      );
    case "mosaic-planning":
      return (
        <>
          <ellipse cx="315" cy="75" rx="245" ry="58" />
          <g>
            {[0, 1, 2].flatMap((row) =>
              [0, 1, 2, 3].map((col) => (
                <rect
                  key={`${row}-${col}`}
                  x={120 + col * 98}
                  y={26 + row * 36}
                  width="112"
                  height="52"
                />
              )),
            )}
          </g>
          <path d="M218 18 V132 M316 18 V132 M414 18 V132" />
          <text x="250" y="146">
            controlled overlap
          </text>
        </>
      );
    case "dew-heater":
      return (
        <>
          <circle cx="260" cy="75" r="52" />
          <circle cx="260" cy="75" r="40" />
          <path d="M208 42 Q260 12 312 42" />
          <path d="M210 108 Q260 138 310 108" />
          <path d="M360 35 L330 58 M380 75 H330 M360 115 L330 92" />
          <text x="210" y="80">
            optic
          </text>
          <text x="190" y="145">
            heater band
          </text>
          <text x="365" y="145">
            heat loss
          </text>
        </>
      );
    case "storage-volume":
      return (
        <>
          <rect x="35" y="38" width="100" height="74" />
          <g>
            {[0, 1, 2].map((i) => (
              <rect
                key={i}
                x={190 + i * 18}
                y={38 + i * 8}
                width="100"
                height="74"
              />
            ))}
          </g>
          <path d="M136 75 H184 M330 75 H410" />
          <path d="M410 35 H575 V115 H410 Z" />
          <text x="48" y="132">
            pixels × bits
          </text>
          <text x="205" y="140">
            frames
          </text>
          <text x="438" y="80">
            session GiB
          </text>
        </>
      );
    case "optimal-sub-exposure":
      return (
        <>
          <line x1="45" y1="105" x2="585" y2="105" />
          <path d="M85 105 C150 104 180 62 245 55 C330 45 420 48 545 48" />
          <line x1="235" y1="25" x2="235" y2="120" />
          <line x1="500" y1="25" x2="500" y2="120" />
          <text x="185" y="140">
            noise floor
          </text>
          <text x="455" y="140">
            saturation
          </text>
        </>
      );
    case "integration-planner":
      return (
        <>
          <g>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <rect key={i} x={40 + i * 65} y="45" width="48" height="58" />
            ))}
          </g>
          <path d="M440 74 H495" />
          <rect x="495" y="28" width="105" height="92" />
          <text x="52" y="132">
            accepted sub-exposures
          </text>
          <text x="510" y="78">
            total T
          </text>
        </>
      );
    case "filter-exposure-planner":
      return (
        <>
          <rect x="40" y="55" width="500" height="40" />
          <path d="M210 55 V95 M390 55 V95" />
          <path d="M40 42 V108 M540 42 V108" />
          <text x="95" y="80">
            channel 1
          </text>
          <text x="250" y="80">
            channel 2
          </text>
          <text x="430" y="80">
            channel 3
          </text>
          <text x="230" y="132">
            fixed time budget
          </text>
        </>
      );
    case "star-saturation":
      return (
        <>
          <rect x="75" y="24" width="145" height="104" />
          <path d="M75 92 H220 M75 48 H220" />
          <path d="M310 110 C350 95 350 45 390 30 C430 15 455 60 490 73 C520 84 540 70 570 55" />
          <text x="92" y="145">
            pixel well
          </text>
          <text x="335" y="145">
            peak electron rate
          </text>
        </>
      );
    case "guiding-exposure":
      return (
        <>
          <path d="M40 105 H590 M85 105 V42 M85 42 L280 75 L470 38" />
          <circle cx="280" cy="75" r="12" />
          <path d="M330 115 L330 30 M440 115 L440 30" />
          <text x="300" y="140">
            SNR limit
          </text>
          <text x="420" y="140">
            motion limit
          </text>
        </>
      );
    case "plate-solving-scale":
      return (
        <>
          <rect x="55" y="28" width="250" height="94" />
          <g>
            {[0, 1, 2, 3].map((i) => (
              <line
                key={i}
                x1={105 + i * 50}
                y1="28"
                x2={105 + i * 50}
                y2="122"
              />
            ))}
          </g>
          <path d="M335 75 H570 M400 58 V92 M520 58 V92" />
          <text x="95" y="145">
            sensor field
          </text>
          <text x="385" y="140">
            scale search interval
          </text>
        </>
      );
    case "imaging-window":
      return (
        <>
          <path d="M45 105 C145 25 245 25 345 105" />
          <line x1="45" y1="78" x2="345" y2="78" />
          <path d="M250 118 H590 M330 118 V42 M520 118 V42" />
          <text x="85" y="140">
            altitude arc
          </text>
          <text x="350" y="140">
            dark overlap
          </text>
        </>
      );
    case "atmospheric-extinction":
      return (
        <>
          <path d="M40 112 H600 M65 90 H575 M95 68 H545 M130 46 H510" />
          <circle cx="485" cy="22" r="11" />
          <path d="M485 33 L300 112 M485 33 L455 112" />
          <text x="100" y="140">
            long low-altitude path
          </text>
          <text x="440" y="140">
            short path
          </text>
        </>
      );
    case "calibration-frames":
      return (
        <>
          <g>
            {[0, 1, 2, 3].map((i) => (
              <rect
                key={i}
                x={45 + i * 48}
                y={40 + i * 6}
                width="64"
                height="70"
              />
            ))}
          </g>
          <path d="M285 75 H390" />
          <rect x="390" y="30" width="145" height="90" />
          <path d="M410 92 L440 70 L465 82 L500 52" />
          <text x="55" y="140">
            N source frames
          </text>
          <text x="410" y="140">
            low-noise master
          </text>
        </>
      );
    case "drizzle-planner":
      return (
        <>
          <g>
            {[0, 1, 2, 3].map((i) => (
              <rect
                key={i}
                x={55 + i * 10}
                y={35 + i * 9}
                width="145"
                height="82"
              />
            ))}
          </g>
          <path d="M270 75 H340" />
          <rect x="340" y="20" width="210" height="110" />
          <path d="M392 20 V130 M444 20 V130 M496 20 V130 M340 57 H550 M340 94 H550" />
          <text x="65" y="145">
            dither offsets
          </text>
          <text x="395" y="145">
            finer grid
          </text>
        </>
      );
    case "field-rotation":
      return (
        <>
          <circle cx="270" cy="75" r="58" />
          <line x1="270" y1="75" x2="328" y2="75" />
          <line x1="270" y1="75" x2="318" y2="42" />
          <path d="M328 75 Q332 56 318 42" />
          <circle cx="328" cy="75" r="7" />
          <circle cx="318" cy="42" r="7" />
          <path d="M380 75 H570" />
          <text x="205" y="145">
            rotating field edge
          </text>
          <text x="415" y="145">
            trail ceiling
          </text>
        </>
      );
    case "autofocus-planning":
      return (
        <>
          <path d="M55 32 C170 35 190 118 300 118 C410 118 430 35 575 32" />
          <line x1="315" y1="20" x2="315" y2="130" />
          <g>
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <circle
                key={i}
                cx={105 + i * 70}
                cy={48 + Math.abs(3 - i) * 17}
                r="6"
              />
            ))}
          </g>
          <path d="M270 132 H360" />
          <text x="230" y="145">
            critical focus zone
          </text>
        </>
      );
  }
}

export function CalculatorLineDiagram({
  kind,
}: {
  kind: CalculatorDiagramKind;
}) {
  const content = copy[kind];
  const titleId = `${kind}-diagram-title`;
  const descriptionId = `${kind}-diagram-description`;
  return (
    <figure className={styles.figure} data-calculator-diagram={kind}>
      <figcaption>
        <p className="eyebrow">Working geometry</p>
        <h2 id={titleId}>{content.title}</h2>
        <p id={descriptionId}>{content.description}</p>
      </figcaption>
      <svg
        role="img"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        viewBox="0 0 640 150"
      >
        <Diagram kind={kind} />
      </svg>
    </figure>
  );
}
