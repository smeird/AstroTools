"use client";

import Link from "next/link";
import {
  startTransition,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";

import { CalculatorNavigation } from "@/components/design-system/calculator-navigation";
import { EquipmentConfigurationPanel } from "@/features/field-of-view/components/equipment-configuration-panel";
import {
  equipmentConfigurationReducer,
  resolveCameraSensor,
  resolveModifierMultipliers,
  resolveTelescopeInputs,
  type EquipmentConfigurationState,
} from "@/features/field-of-view/model/equipment-configuration";
import {
  FIELD_OF_VIEW_PERSISTENCE_KEY,
  serializePersistedFieldOfViewState,
} from "@/features/field-of-view/model/persistence";
import type { FieldOfViewShareNotice } from "@/features/field-of-view/schemas/shareable-state";
import type { FieldOfViewCatalogue } from "@/features/field-of-view/services/calculator-catalogue";
import {
  cameraSelectionFromConfiguration,
  imagingTrainFromConfiguration,
  serializeSharedCameraSelection,
  serializeSharedTelescopeSelection,
  serializeSharedImagingTrain,
  SHARED_CAMERA_SELECTION_KEY,
  SHARED_TELESCOPE_SELECTION_KEY,
  SHARED_IMAGING_TRAIN_KEY,
  telescopeSelectionFromConfiguration,
} from "@/features/shared-equipment/telescope-selection";
import { calculateImagingSystem } from "@/lib/calculations";

import {
  EQUIPMENT_PERSISTENCE_KEY,
  equipmentUrl,
  parseEquipmentState,
  serializeEquipmentState,
  type ObservingSiteConditions,
} from "../schemas/equipment-state";
import styles from "./equipment-workspace.module.css";
import { ImagingTrainDiagram } from "./imaging-train-diagram";

const format = (value: number, digits = 2) =>
  value.toLocaleString("en-GB", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

function noticeText(notice: FieldOfViewShareNotice | null): string | null {
  if (!notice) return null;
  if (notice.kind === "unsupported-version")
    return "This bookmark uses an unsupported equipment version, so safe defaults were restored.";
  return `Some saved equipment values were invalid and safely replaced: ${notice.settings.join(", ")}.`;
}

export function EquipmentWorkspace({
  catalogue,
  initialConfiguration,
  shareNotice,
  restorePersistedState,
  initialRigName = "",
  initialSite = { bortleClass: "", skyQualityMagArcsec2: "" },
}: {
  catalogue: FieldOfViewCatalogue;
  initialConfiguration: EquipmentConfigurationState;
  shareNotice: FieldOfViewShareNotice | null;
  restorePersistedState: boolean;
  initialRigName?: string;
  initialSite?: ObservingSiteConditions;
}) {
  const [state, dispatch] = useReducer(
    equipmentConfigurationReducer,
    initialConfiguration,
  );
  const [copyStatus, setCopyStatus] = useState("");
  const [rigName, setRigName] = useState(initialRigName);
  const [site, setSite] = useState(initialSite);
  const [persistedStateLoaded, setPersistedStateLoaded] = useState(
    !restorePersistedState,
  );
  const telescope = resolveTelescopeInputs(state.telescope);
  const camera = resolveCameraSensor(state.camera);
  const modifiers = resolveModifierMultipliers(state.modifiers);
  const result = useMemo(() => {
    if (
      telescope.nativeFocalLengthMm === null ||
      telescope.apertureMm === null ||
      !camera ||
      !modifiers
    )
      return null;
    return calculateImagingSystem({
      nativeFocalLengthMm: telescope.nativeFocalLengthMm,
      apertureMm: telescope.apertureMm,
      opticalMultipliers: modifiers,
      sensor: camera,
      binningFactor: Number(state.binning),
      seeingFwhmArcsec: state.seeingFwhmArcsec,
    });
  }, [camera, modifiers, state.binning, state.seeingFwhmArcsec, telescope]);

  const equipmentParams = serializeEquipmentState(state, rigName, site);
  const fieldOfViewHref = equipmentParams
    ? `/calculators/field-of-view?${equipmentParams.toString()}`
    : "/calculators/field-of-view";

  useEffect(() => {
    const stored = restorePersistedState
      ? window.localStorage.getItem(EQUIPMENT_PERSISTENCE_KEY)
      : null;
    const parsedStored = stored
      ? parseEquipmentState(new URLSearchParams(stored), catalogue)
      : null;
    startTransition(() => {
      if (parsedStored) {
        dispatch({ type: "hydrate", state: parsedStored.state });
        setRigName(parsedStored.rigName);
        setSite(parsedStored.site);
      }
      setPersistedStateLoaded(true);
    });
  }, [catalogue, restorePersistedState]);

  useEffect(() => {
    if (!persistedStateLoaded) return;
    const url = equipmentUrl(window.location.origin, state, rigName, site);
    if (url) window.history.replaceState(null, "", url);
    document.title = rigName
      ? `${rigName} · Equipment · Astrotools`
      : "Your Equipment Workspace · Astrotools";
    const equipment = serializeEquipmentState(state, rigName, site);
    if (equipment)
      window.localStorage.setItem(
        EQUIPMENT_PERSISTENCE_KEY,
        equipment.toString(),
      );
    const persisted = serializePersistedFieldOfViewState(state);
    if (persisted)
      window.localStorage.setItem(FIELD_OF_VIEW_PERSISTENCE_KEY, persisted);
    const selectedTelescope = telescopeSelectionFromConfiguration(
      state.telescope,
    );
    if (selectedTelescope)
      window.localStorage.setItem(
        SHARED_TELESCOPE_SELECTION_KEY,
        serializeSharedTelescopeSelection(selectedTelescope),
      );
    const selectedCamera = cameraSelectionFromConfiguration(state.camera);
    if (selectedCamera)
      window.localStorage.setItem(
        SHARED_CAMERA_SELECTION_KEY,
        serializeSharedCameraSelection(selectedCamera),
      );
    const imagingTrain = imagingTrainFromConfiguration(state, rigName, site);
    if (imagingTrain)
      window.localStorage.setItem(
        SHARED_IMAGING_TRAIN_KEY,
        serializeSharedImagingTrain(imagingTrain),
      );
  }, [persistedStateLoaded, rigName, site, state]);

  async function copyBookmark() {
    const url = equipmentUrl(window.location.origin, state, rigName, site);
    if (!url) {
      setCopyStatus("Complete the labelled equipment fields before copying.");
      return;
    }
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopyStatus("Equipment URL copied. Bookmark it to reopen this setup.");
    } catch {
      setCopyStatus(
        `Copy unavailable. Bookmark this address: ${url.toString()}`,
      );
    }
  }

  const sharedNotice = noticeText(shareNotice);
  return (
    <main id="main-content" className={styles.page} tabIndex={-1}>
      <Link className={styles.backLink} href="/">
        ← Astrotools home
      </Link>
      <CalculatorNavigation active="equipment" />
      <header className={styles.intro}>
        <p className="eyebrow">Your equipment workspace</p>
        <h1>One setup. Complete equipment context.</h1>
        <p className={styles.lede}>
          Configure your imaging train once. This equipment-only page keeps the
          setup in its URL; the separate calculations sheet consumes the same
          train without an account.
        </p>
        <label className={styles.rigNameField}>
          <span>Rig name</span>
          <input
            maxLength={80}
            onChange={(event) => setRigName(event.target.value)}
            placeholder="e.g. Garden wide-field rig"
            type="text"
            value={rigName}
          />
          <small>
            Included in this page address and browser bookmark title.
          </small>
        </label>
        <fieldset className={styles.siteFields}>
          <legend>Observing site (optional)</legend>
          <label>
            <span>Bortle class</span>
            <select
              value={site.bortleClass}
              onChange={(event) =>
                setSite((current) => ({
                  ...current,
                  bortleClass: event.target.value,
                }))
              }
            >
              <option value="">Not specified</option>
              {Array.from({ length: 9 }, (_, index) => index + 1).map(
                (bortle) => (
                  <option value={bortle} key={bortle}>
                    Bortle {bortle}
                  </option>
                ),
              )}
            </select>
          </label>
          <label>
            <span>Sky quality (SQM)</span>
            <span className={styles.inputWithUnit}>
              <input
                inputMode="decimal"
                min="10"
                max="25"
                step="0.01"
                type="number"
                value={site.skyQualityMagArcsec2}
                onChange={(event) =>
                  setSite((current) => ({
                    ...current,
                    skyQualityMagArcsec2: event.target.value,
                  }))
                }
              />
              <span>mag/arcsec²</span>
            </span>
          </label>
          <small>
            Record either or both measurements. Bortle and SQM are kept as
            separate observations; Astrotools does not invent an exact
            conversion between them.
          </small>
        </fieldset>
        <button
          className={styles.copyButton}
          onClick={copyBookmark}
          type="button"
        >
          Copy equipment URL
        </button>
        <p className={styles.copyStatus} aria-live="polite">
          {copyStatus}
        </p>
        {sharedNotice ? (
          <p className={styles.notice} role="note">
            {sharedNotice}
          </p>
        ) : null}
      </header>

      <div className={styles.workspace}>
        <div className={styles.configuration}>
          <EquipmentConfigurationPanel
            catalogue={catalogue}
            dispatch={dispatch}
            scope="equipment"
            state={state}
          />
        </div>
        <aside
          className={styles.trainSummary}
          aria-labelledby="train-summary-title"
        >
          <p className="eyebrow">Effective imaging train</p>
          <h2 id="train-summary-title">Setup check</h2>
          {result ? (
            <dl>
              <div>
                <dt>Effective focal length</dt>
                <dd>{format(result.effectiveFocalLengthMm, 0)} mm</dd>
              </div>
              <div>
                <dt>Effective focal ratio</dt>
                <dd>f/{format(result.effectiveFocalRatio, 1)}</dd>
              </div>
              <div>
                <dt>Sensor</dt>
                <dd>
                  {format(result.sensorDimensionsMm.widthMm)} ×{" "}
                  {format(result.sensorDimensionsMm.heightMm)} mm
                </dd>
              </div>
              <div>
                <dt>Image scale</dt>
                <dd>{format(result.imageScaleArcsecPerPixel, 3)}″ / px</dd>
              </div>
            </dl>
          ) : (
            <p>Complete the equipment fields to verify the effective train.</p>
          )}
          <ImagingTrainDiagram state={state} />
          <Link className={styles.calculationsLink} href="/calculations">
            View all calculations →
          </Link>
        </aside>
        <section
          hidden
          className={styles.overview}
          aria-labelledby="overview-title"
        >
          <div className={styles.overviewHeader}>
            <p className="eyebrow">Calculated overview</p>
            <h2 id="overview-title">What this setup tells you</h2>
            <p>
              Open any card for its full controls, equations, and
              interpretation.
            </p>
          </div>
          <div className={styles.cards}>
            <article className={styles.card}>
              <p className={styles.kind}>Exact geometry</p>
              <h3>Field of View</h3>
              {result ? (
                <>
                  <strong>
                    {format(result.fieldOfViewDeg.horizontalDeg)}° ×{" "}
                    {format(result.fieldOfViewDeg.verticalDeg)}°
                  </strong>
                  <span>
                    {format(result.imageScaleArcsecPerPixel, 3)}″ per pixel
                  </span>
                </>
              ) : (
                <p>Needs valid telescope and camera geometry.</p>
              )}
              <Link href={fieldOfViewHref}>Open field details →</Link>
            </article>
            <article className={styles.card}>
              <p className={styles.kind}>Equipment-derived</p>
              <h3>Resolution &amp; Sampling</h3>
              {result ? (
                <>
                  <strong>
                    {format(result.imageScaleArcsecPerPixel, 3)}″ / px
                  </strong>
                  <span>
                    Wavelength and seeing are chosen in the detail calculator.
                  </span>
                </>
              ) : (
                <p>Needs aperture, focal length, and pixel pitch.</p>
              )}
              <Link href="/calculators/resolution-and-sampling">
                Open resolution details →
              </Link>
            </article>
            <article className={styles.card}>
              <p className={styles.kind}>Full train ready</p>
              <h3>Drift &amp; Polar Alignment</h3>
              {result ? (
                <>
                  <strong>
                    {format(result.imageScaleArcsecPerPixel, 3)}″ / px
                  </strong>
                  <span>
                    Add a measured signed drift, duration and pointing geometry.
                  </span>
                </>
              ) : (
                <p>Needs the effective imaging train.</p>
              )}
              <Link href="/calculators/polar-alignment-drift">
                Diagnose measured drift →
              </Link>
            </article>
            <article className={styles.card}>
              <p className={styles.kind}>Exact field ready</p>
              <h3>Mosaic Planning</h3>
              {result ? (
                <>
                  <strong>
                    {format(result.fieldOfViewDeg.horizontalDeg)}° ×{" "}
                    {format(result.fieldOfViewDeg.verticalDeg)}°
                  </strong>
                  <span>Add target extent, overlap and time per panel.</span>
                </>
              ) : (
                <p>Needs focal length and sensor dimensions.</p>
              )}
              <Link href="/calculators/mosaic-planning">
                Build a panel grid →
              </Link>
            </article>
            <article className={styles.card}>
              <p className={styles.kind}>Optical train</p>
              <h3>Reducer &amp; Barlow</h3>
              {result ? (
                <>
                  <strong>{format(result.effectiveFocalLengthMm, 0)} mm</strong>
                  <span>
                    Effective f/{format(result.effectiveFocalRatio, 1)} from{" "}
                    {state.modifiers.length || "no"} modifier
                    {state.modifiers.length === 1 ? "" : "s"}.
                  </span>
                </>
              ) : (
                <p>Needs a valid optical train.</p>
              )}
              <Link href="/calculators/modifier-effects">
                Open modifier details →
              </Link>
            </article>
            <article className={styles.card}>
              <p className={styles.kind}>Needs measurement</p>
              <h3>Sensor Tilt</h3>
              <p>
                Enter focus differences across the sensor in the detail
                calculator.
              </p>
              <Link href="/calculators/sensor-tilt">Measure sensor tilt →</Link>
            </article>
            <article className={styles.card}>
              <p className={styles.kind}>Needs dimensions</p>
              <h3>Back-focus Spacing</h3>
              <p>
                Enter component depths and the manufacturer’s nominal back
                focus.
              </p>
              <Link href="/calculators/backfocus-spacing">
                Build the spacing stack →
              </Link>
            </article>
            <article className={styles.card}>
              <p className={styles.kind}>Main train ready</p>
              <h3>Guiding Ratio</h3>
              {result ? (
                <>
                  <strong>
                    {format(result.imageScaleArcsecPerPixel, 3)}″ / px
                  </strong>
                  <span>
                    Add the guide scope and camera in the detail calculator.
                  </span>
                </>
              ) : (
                <p>Needs imaging focal length and pixel pitch.</p>
              )}
              <Link href="/calculators/guiding-ratio">
                Compare guiding scales →
              </Link>
            </article>
            <article className={styles.card}>
              <p className={styles.kind}>Full train ready</p>
              <h3>Exposure &amp; Signal-to-Noise</h3>
              {result ? (
                <>
                  <strong>
                    {format(result.imageScaleArcsecPerPixel, 3)}″ / px
                  </strong>
                  <span>Add measured source, sky and camera-noise rates.</span>
                </>
              ) : (
                <p>Needs the effective imaging train.</p>
              )}
              <Link href="/calculators/exposure-snr">
                Estimate the exposure stack →
              </Link>
            </article>
            <article className={styles.card}>
              <p className={styles.kind}>Needs weather</p>
              <h3>Dew Point &amp; Heater Power</h3>
              {telescope.apertureMm ? (
                <>
                  <strong>{format(telescope.apertureMm, 0)} mm optic</strong>
                  <span>Add temperature, humidity and heater geometry.</span>
                </>
              ) : (
                <p>Needs optic diameter and local conditions.</p>
              )}
              <Link href="/calculators/dew-heater">Plan dew control →</Link>
            </article>
            <article className={styles.card}>
              <p className={styles.kind}>Camera-derived</p>
              <h3>Storage &amp; Data Volume</h3>
              {state.camera.resolutionWidthPx &&
              state.camera.resolutionHeightPx ? (
                <>
                  <strong>
                    {Number(state.camera.resolutionWidthPx).toLocaleString(
                      "en-GB",
                    )}{" "}
                    ×{" "}
                    {Number(state.camera.resolutionHeightPx).toLocaleString(
                      "en-GB",
                    )}{" "}
                    px
                  </strong>
                  <span>Add format, exposure cadence and session length.</span>
                </>
              ) : (
                <p>Needs camera pixel resolution.</p>
              )}
              <Link href="/calculators/storage-volume">
                Build a data budget →
              </Link>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
