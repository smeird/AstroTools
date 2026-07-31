import type { SharedTelescopeSelection } from "@/features/shared-equipment/telescope-selection";

import styles from "./shared-telescope-notice.module.css";

export function SharedTelescopeNotice({
  selection,
  used,
}: {
  selection: SharedTelescopeSelection | null;
  used: boolean;
}) {
  if (!selection) return null;
  return (
    <p className={styles.notice} data-testid="shared-telescope">
      <span>
        Remembered telescope: <strong>{selection.label}</strong>
      </span>
      <span className={styles.detail}>
        {selection.nativeFocalLengthMm} mm · {selection.apertureMm} mm aperture
      </span>
      {!used ? (
        <span>This calculator does not use telescope geometry.</span>
      ) : null}
    </p>
  );
}
