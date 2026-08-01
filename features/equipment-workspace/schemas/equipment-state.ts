import type { EquipmentConfigurationState } from "@/features/field-of-view/model/equipment-configuration";
import {
  extractFieldOfViewShareReferences,
  normaliseFieldOfViewPageSearchParams,
  parseFieldOfViewShareState,
  serializeFieldOfViewShareState,
  type FieldOfViewPageSearchParams,
  type FieldOfViewShareNotice,
  type FieldOfViewShareReferences,
} from "@/features/field-of-view/schemas/shareable-state";
import type { FieldOfViewCatalogue } from "@/features/field-of-view/services/calculator-catalogue";

export const EQUIPMENT_WORKSPACE_PATH = "/equipment";
export const EQUIPMENT_PERSISTENCE_KEY = "astrotools.equipment-workspace.v1";
const EQUIPMENT_KEYS = new Set([
  "n",
  "v",
  "t",
  "tm",
  "fm",
  "f",
  "a",
  "fr",
  "c",
  "cm",
  "cg",
  "sw",
  "sh",
  "px",
  "rw",
  "rh",
  "m",
  "b",
  "bo",
  "sqm",
]);

export interface ObservingSiteConditions {
  readonly bortleClass: string;
  readonly skyQualityMagArcsec2: string;
}

export interface ParsedEquipmentState {
  readonly state: EquipmentConfigurationState;
  readonly rigName: string;
  readonly site: ObservingSiteConditions;
  readonly notice: FieldOfViewShareNotice | null;
}

export const MAX_RIG_NAME_LENGTH = 80;

function normaliseBortle(value: string | null): string {
  return /^[1-9]$/.test(value ?? "") ? (value ?? "") : "";
}

function normaliseSqm(value: string | null): string {
  if (!value) return "";
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 10 && numeric <= 25
    ? String(numeric)
    : "";
}

export function normaliseRigName(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_RIG_NAME_LENGTH);
}

export function normaliseEquipmentPageSearchParams(
  raw: FieldOfViewPageSearchParams,
): URLSearchParams {
  const normalized = normaliseFieldOfViewPageSearchParams(raw);
  const rawName = Array.isArray(raw.n) ? raw.n[0] : raw.n;
  if (typeof rawName === "string") {
    const rigName = normaliseRigName(rawName);
    if (rigName) normalized.set("n", rigName);
  }
  const rawBortle = Array.isArray(raw.bo) ? raw.bo[0] : raw.bo;
  const rawSqm = Array.isArray(raw.sqm) ? raw.sqm[0] : raw.sqm;
  if (typeof rawBortle === "string") normalized.set("bo", rawBortle);
  if (typeof rawSqm === "string") normalized.set("sqm", rawSqm);
  for (const key of [...normalized.keys()]) {
    if (!EQUIPMENT_KEYS.has(key)) normalized.delete(key);
  }
  return normalized;
}

export function parseEquipmentState(
  searchParams: URLSearchParams,
  catalogue: FieldOfViewCatalogue,
): ParsedEquipmentState {
  const parsed = parseFieldOfViewShareState(searchParams, catalogue);
  const rigName = normaliseRigName(searchParams.get("n"));
  const site = {
    bortleClass: normaliseBortle(searchParams.get("bo")),
    skyQualityMagArcsec2: normaliseSqm(searchParams.get("sqm")),
  };
  if (parsed.notice?.kind !== "invalid-settings")
    return { ...parsed, rigName, site };
  const settings = parsed.notice.settings.filter(
    (setting) => setting !== "astronomical target",
  );
  return {
    state: parsed.state,
    rigName,
    site,
    notice: settings.length > 0 ? { kind: "invalid-settings", settings } : null,
  };
}

export function serializeEquipmentState(
  state: EquipmentConfigurationState,
  rigName = "",
  site: ObservingSiteConditions = {
    bortleClass: "",
    skyQualityMagArcsec2: "",
  },
): URLSearchParams | null {
  // The established serializer validates the whole Field of View state. Supply
  // a private valid target placeholder because target/seeing/framing are not
  // part of an equipment bookmark and may be unavailable with an offline
  // catalogue.
  const complete = serializeFieldOfViewShareState({
    ...state,
    targetSlug: state.targetSlug ?? "equipment-overview",
  });
  if (!complete) return null;
  for (const key of [...complete.keys()]) {
    if (!EQUIPMENT_KEYS.has(key)) complete.delete(key);
  }
  const normalizedName = normaliseRigName(rigName);
  if (normalizedName) complete.set("n", normalizedName);
  const bortle = normaliseBortle(site.bortleClass);
  const sqm = normaliseSqm(site.skyQualityMagArcsec2);
  if (bortle) complete.set("bo", bortle);
  if (sqm) complete.set("sqm", sqm);
  return complete;
}

export function extractEquipmentReferences(
  searchParams: URLSearchParams,
): FieldOfViewShareReferences {
  return extractFieldOfViewShareReferences(searchParams);
}

export function equipmentUrl(
  origin: string,
  state: EquipmentConfigurationState,
  rigName = "",
  site?: ObservingSiteConditions,
): URL | null {
  const params = serializeEquipmentState(state, rigName, site);
  if (!params) return null;
  const url = new URL(EQUIPMENT_WORKSPACE_PATH, origin);
  url.search = params.toString();
  return url;
}
