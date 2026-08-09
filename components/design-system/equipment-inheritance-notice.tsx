import styles from "./shared-telescope-notice.module.css";

export function EquipmentInheritanceNotice({
  appliedFields,
  equipmentLabel,
}: {
  appliedFields: readonly string[];
  equipmentLabel: string | null;
}) {
  if (!equipmentLabel) return null;

  return (
    <p className={styles.notice} data-testid="shared-equipment" role="note">
      <span>
        Saved rig: <strong>{equipmentLabel}</strong>
      </span>
      {appliedFields.length ? (
        <span className={styles.detail}>
          Applied from equipment: {appliedFields.join(", ")}.
        </span>
      ) : (
        <span>
          This calculator uses specialist measurements that are not stored in
          the equipment profile.
        </span>
      )}
    </p>
  );
}
