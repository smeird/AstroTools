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
  serializeSharedCameraSelection,
  serializeSharedTelescopeSelection,
  SHARED_CAMERA_SELECTION_KEY,
  SHARED_TELESCOPE_SELECTION_KEY,
  telescopeSelectionFromConfiguration,
} from "@/features/shared-equipment/telescope-selection";
import { calculateImagingSystem } from "@/lib/calculations";

import {
  EQUIPMENT_PERSISTENCE_KEY,
  equipmentUrl,
  parseEquipmentState,
  serializeEquipmentState,
} from "../schemas/equipment-state";
import styles from "./equipment-workspace.module.css";

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
}: {
  catalogue: FieldOfViewCatalogue;
  initialConfiguration: EquipmentConfigurationState;
  shareNotice: FieldOfViewShareNotice | null;
  restorePersistedState: boolean;
}) {
  const [state, dispatch] = useReducer(
    equipmentConfigurationReducer,
    initialConfiguration,
  );
  const [copyStatus, setCopyStatus] = useState("");
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

  const equipmentParams = serializeEquipmentState(state);
  const fieldOfViewHref = equipmentParams
    ? `/calculators/field-of-view?${equipmentParams.toString()}`
    : "/calculators/field-of-view";

  useEffect(() => {
    const stored = restorePersistedState
      ? window.localStorage.getItem(EQUIPMENT_PERSISTENCE_KEY)
      : null;
    const restored = stored
      ? parseEquipmentState(new URLSearchParams(stored), catalogue).state
      : null;
    startTransition(() => {
      if (restored) dispatch({ type: "hydrate", state: restored });
      setPersistedStateLoaded(true);
    });
  }, [catalogue, restorePersistedState]);

  useEffect(() => {
    if (!persistedStateLoaded) return;
    const url = equipmentUrl(window.location.origin, state);
    if (url) window.history.replaceState(null, "", url);
    const equipment = serializeEquipmentState(state);
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
  }, [persistedStateLoaded, state]);

  async function copyBookmark() {
    const url = equipmentUrl(window.location.origin, state);
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
        <h1>One setup. Every useful calculation.</h1>
        <p className={styles.lede}>
          Configure your normal imaging train once. This page keeps the setup in
          its URL, so the bookmark itself restores your equipment without an
          account.
        </p>
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
        <section className={styles.overview} aria-labelledby="overview-title">
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
          </div>
        </section>
      </div>
    </main>
  );
}
