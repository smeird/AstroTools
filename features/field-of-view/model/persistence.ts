import type { FieldOfViewCatalogue } from "../services/calculator-catalogue";
import {
  parseFieldOfViewShareState,
  serializeFieldOfViewShareState,
} from "../schemas/shareable-state";
import type { EquipmentConfigurationState } from "./equipment-configuration";

export const FIELD_OF_VIEW_PERSISTENCE_KEY =
  "astrotools.field-of-view.settings.v1";

export function serializePersistedFieldOfViewState(
  state: EquipmentConfigurationState,
): string | null {
  return serializeFieldOfViewShareState(state)?.toString() ?? null;
}

export function parsePersistedFieldOfViewState(
  value: string,
  catalogue: FieldOfViewCatalogue,
): EquipmentConfigurationState | null {
  try {
    const parsed = parseFieldOfViewShareState(
      new URLSearchParams(value),
      catalogue,
    );
    return parsed.notice ? null : parsed.state;
  } catch {
    return null;
  }
}
