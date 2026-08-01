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
]);

export interface ParsedEquipmentState {
  readonly state: EquipmentConfigurationState;
  readonly notice: FieldOfViewShareNotice | null;
}

export function normaliseEquipmentPageSearchParams(
  raw: FieldOfViewPageSearchParams,
): URLSearchParams {
  const normalized = normaliseFieldOfViewPageSearchParams(raw);
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
  if (parsed.notice?.kind !== "invalid-settings") return parsed;
  const settings = parsed.notice.settings.filter(
    (setting) => setting !== "astronomical target",
  );
  return {
    state: parsed.state,
    notice: settings.length > 0 ? { kind: "invalid-settings", settings } : null,
  };
}

export function serializeEquipmentState(
  state: EquipmentConfigurationState,
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
): URL | null {
  const params = serializeEquipmentState(state);
  if (!params) return null;
  const url = new URL(EQUIPMENT_WORKSPACE_PATH, origin);
  url.search = params.toString();
  return url;
}
