import Link from "next/link";

import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { SkipLink } from "@/components/design-system/skip-link";

const calculatorGroups = [
  {
    id: "optics-image",
    label: "Optics & image",
    calculators: [
      [
        "Field of View",
        "/calculators/field-of-view",
        "Frame, scale and target fit",
      ],
      [
        "Reducer & Barlow",
        "/calculators/modifier-effects",
        "Effective focal train",
      ],
      [
        "Resolution & Sampling",
        "/calculators/resolution-and-sampling",
        "Diffraction, seeing and pixels",
      ],
      ["Sensor Tilt", "/calculators/sensor-tilt", "Focus-plane diagnosis"],
      [
        "Back-focus",
        "/calculators/backfocus-spacing",
        "Mechanical spacing stack",
      ],
    ],
  },
  {
    id: "acquisition-alignment",
    label: "Acquisition & alignment",
    calculators: [
      [
        "Guiding Ratio",
        "/calculators/guiding-ratio",
        "Guide and imaging scales",
      ],
      [
        "Polar Alignment",
        "/calculators/polar-alignment-drift",
        "Measured drift diagnosis",
      ],
      [
        "Exposure & SNR",
        "/calculators/exposure-snr",
        "Calibrated stack estimate",
      ],
      [
        "Optimal Sub-exposure",
        "/calculators/optimal-sub-exposure",
        "Background and saturation limits",
      ],
      [
        "Integration Planner",
        "/calculators/integration-planner",
        "Frames, rejection and depth",
      ],
      [
        "Filter Allocation",
        "/calculators/filter-exposure-planner",
        "Channel time and throughput",
      ],
      ["Star Saturation", "/calculators/star-saturation", "Highlight headroom"],
      [
        "Guiding Exposure",
        "/calculators/guiding-exposure",
        "Centroid SNR and cadence",
      ],
      [
        "Mosaic Planning",
        "/calculators/mosaic-planning",
        "Panel grid and integration",
      ],
    ],
  },
  {
    id: "sky-focus",
    label: "Sky, solving & focus",
    calculators: [
      [
        "Plate-solving Scale",
        "/calculators/plate-solving-scale",
        "Solver scale and field hints",
      ],
      [
        "Imaging Window",
        "/calculators/imaging-window",
        "Altitude and darkness overlap",
      ],
      [
        "Atmospheric Extinction",
        "/calculators/atmospheric-extinction",
        "Airmass and transmission",
      ],
      [
        "Field Rotation",
        "/calculators/field-rotation",
        "Alt-az exposure ceiling",
      ],
      [
        "Autofocus Planning",
        "/calculators/autofocus-planning",
        "Critical focus zone and sweep",
      ],
    ],
  },
  {
    id: "session-operations",
    label: "Session operations",
    calculators: [
      ["Dew & Heater", "/calculators/dew-heater", "Dew point and heater load"],
      [
        "Calibration Frames",
        "/calculators/calibration-frames",
        "Master noise and frame counts",
      ],
      [
        "Drizzle Planner",
        "/calculators/drizzle-planner",
        "Sampling, output and memory",
      ],
      ["Storage", "/calculators/storage-volume", "Capture data budget"],
    ],
  },
] as const;

export default function HomePage() {
  return (
    <>
      <SkipLink />
      <SiteHeader releaseLabel="Astrophotography Planning Suite" />

      <main id="main-content" tabIndex={-1}>
        <section className="home-hero" aria-labelledby="hero-title">
          <div className="home-hero-copy">
            <p className="eyebrow">One imaging train · every planning result</p>
            <h1 id="hero-title">Know your rig before you lose the night.</h1>
            <p className="lede">
              Name your telescope, modifiers and camera once. Astrotools carries
              that complete train through exact geometry, sampling, guiding,
              alignment, exposure, mosaics, environment and storage planning.
            </p>
            <div className="home-actions" aria-label="Start planning">
              <Link className="primary-action" href="/equipment">
                Build or open my rig <span aria-hidden="true">→</span>
              </Link>
              <Link className="secondary-action" href="/calculations">
                Open the calculation dossier <span aria-hidden="true">→</span>
              </Link>
            </div>
            <ul className="home-proofs" aria-label="Workspace capabilities">
              <li>
                <strong>23</strong>
                <span>connected calculators</span>
              </li>
              <li>
                <strong>1 URL</strong>
                <span>named rig bookmark</span>
              </li>
              <li>
                <strong>PDF</strong>
                <span>print-ready dossier</span>
              </li>
            </ul>
          </div>

          <div
            className="rig-flow"
            aria-label="Equipment flows into every calculation"
          >
            <div className="rig-flow-heading">
              <p className="eyebrow">Shared calculation context</p>
              <span>Local · account-free</span>
            </div>
            <div className="rig-flow-train" aria-hidden="true">
              <div className="rig-part rig-scope">
                <span>Telescope</span>
                <b>600 mm</b>
              </div>
              <i>+</i>
              <div className="rig-part rig-modifier">
                <span>Reducer</span>
                <b>0.7×</b>
              </div>
              <i>+</i>
              <div className="rig-part rig-camera">
                <span>Camera</span>
                <b>3.76 µm</b>
              </div>
            </div>
            <div className="rig-flow-result">
              <span>Effective train</span>
              <strong>420 mm · f/5.3 · 1.85″/px</strong>
            </div>
            <div className="rig-flow-branches" aria-hidden="true">
              <span>Geometry</span>
              <span>Resolution</span>
              <span>Guiding</span>
              <span>Exposure</span>
              <span>Mosaic</span>
              <span>Operations</span>
            </div>
          </div>
        </section>

        <section className="home-workflow" aria-labelledby="workflow-title">
          <div>
            <p className="eyebrow">A reusable planning workflow</p>
            <h2 id="workflow-title">Specify once. Inspect everything.</h2>
          </div>
          <ol>
            <li>
              <span>01</span>
              <div>
                <strong>Name the rig</strong>
                <p>
                  Save the complete optical train in a transparent bookmark URL.
                </p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Review the dossier</strong>
                <p>
                  See every derivable result together in Presentation or
                  Academic view.
                </p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Refine the measurement</strong>
                <p>
                  Open a specialist calculator only when it needs
                  session-specific inputs.
                </p>
              </div>
            </li>
            <li>
              <span>04</span>
              <div>
                <strong>Take it outside</strong>
                <p>
                  Export a dense A4 PDF for the observatory, field or equipment
                  case.
                </p>
              </div>
            </li>
          </ol>
        </section>

        <section
          className="calculator-index"
          aria-labelledby="calculator-index-title"
        >
          <div className="calculator-index-heading">
            <p className="eyebrow">Complete calculator index</p>
            <h2 id="calculator-index-title">From photons to disk space.</h2>
            <p>
              Exact results, empirical estimates and first-order models stay
              visibly distinguished.
            </p>
          </div>
          <div className="calculator-groups">
            {calculatorGroups.map((group) => (
              <section key={group.id} aria-labelledby={`group-${group.id}`}>
                <h3 id={`group-${group.id}`}>{group.label}</h3>
                <ul>
                  {group.calculators.map(([name, href, description]) => (
                    <li key={href}>
                      <Link href={href}>
                        <strong>{name}</strong>
                        <span>{description}</span>
                        <i aria-hidden="true">↗</i>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
