import type { TelescopeConfiguration } from "@/features/field-of-view/model/equipment-configuration";
import {
  resolveTelescopeInputs,
  telescopeIsCustomised,
} from "@/features/field-of-view/model/equipment-configuration";

export const SHARED_TELESCOPE_SELECTION_KEY =
  "astrotools.shared.telescope-selection.v1";

export interface SharedTelescopeSelection {
  readonly version: 1;
  readonly slug: string | null;
  readonly label: string;
  readonly nativeFocalLengthMm: string;
  readonly apertureMm: string;
}

export function telescopeSelectionFromConfiguration(
  telescope: TelescopeConfiguration,
): SharedTelescopeSelection | null {
  const resolved = resolveTelescopeInputs(telescope);
  if (resolved.nativeFocalLengthMm === null || resolved.apertureMm === null) {
    return null;
  }
  const customised = telescopeIsCustomised(telescope);
  return {
    version: 1,
    slug: customised ? null : (telescope.lastPreset?.slug ?? null),
    label: telescope.lastPreset
      ? telescope.lastPreset.label + (customised ? " (customised)" : "")
      : "Custom telescope",
    nativeFocalLengthMm: String(resolved.nativeFocalLengthMm),
    apertureMm: String(resolved.apertureMm),
  };
}

export function serializeSharedTelescopeSelection(
  selection: SharedTelescopeSelection,
): string {
  return JSON.stringify(selection);
}

export function parseSharedTelescopeSelection(
  value: string,
): SharedTelescopeSelection | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return null;
    const candidate = parsed as Record<string, unknown>;
    if (
      candidate.version !== 1 ||
      !(candidate.slug === null || typeof candidate.slug === "string") ||
      typeof candidate.label !== "string" ||
      candidate.label.trim() === "" ||
      typeof candidate.nativeFocalLengthMm !== "string" ||
      typeof candidate.apertureMm !== "string" ||
      !Number.isFinite(Number(candidate.nativeFocalLengthMm)) ||
      Number(candidate.nativeFocalLengthMm) <= 0 ||
      !Number.isFinite(Number(candidate.apertureMm)) ||
      Number(candidate.apertureMm) <= 0
    )
      return null;
    return candidate as unknown as SharedTelescopeSelection;
  } catch {
    return null;
  }
}

export function applySharedTelescopeWhenChanged<T extends object>(
  values: T,
  selection: SharedTelescopeSelection | null,
  appliedSelection: string | null,
  map: (current: T, telescope: SharedTelescopeSelection) => T,
): { values: T; appliedSelection: string | null; changed: boolean } {
  if (!selection) return { values, appliedSelection, changed: false };
  const serialized = serializeSharedTelescopeSelection(selection);
  if (serialized === appliedSelection) {
    return { values, appliedSelection, changed: false };
  }
  return {
    values: map(values, selection),
    appliedSelection: serialized,
    changed: true,
  };
}
