"use client";

import { useId } from "react";

import styles from "./field.module.css";
import { fieldDescriptionIds } from "./field-message";
import type { FieldProps } from "./field-types";

export interface NumericInputProps extends FieldProps {
  name: string;
  value: string;
  readOnly?: boolean;
  min?: number;
  max?: number;
  step?: number | "any";
  unit?: string;
  unitLabel?: string;
  onValueChange(value: string): void;
}

export function NumericInput({
  id,
  label,
  description,
  error,
  disabled,
  required,
  name,
  value,
  readOnly,
  min,
  max,
  step,
  unit,
  unitLabel,
  onValueChange,
}: NumericInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = `${inputId}-description`;
  const errorId = `${inputId}-error`;
  const unitId = `${inputId}-unit`;
  const messageIds = fieldDescriptionIds(
    description,
    error,
    descriptionId,
    errorId,
  );
  const describedBy =
    [unit ? unitId : null, messageIds].filter(Boolean).join(" ") || undefined;

  return (
    <div className={styles.field}>
      <div className={styles.labelRow}>
        <label className={styles.label} htmlFor={inputId}>
          {label}
        </label>
        {unit ? (
          <span aria-hidden="true" className={styles.unit}>
            {unit}
          </span>
        ) : null}
      </div>
      {unit ? (
        <span className={styles.visuallyHidden} id={unitId}>
          Unit: {unitLabel ?? unit}
        </span>
      ) : null}
      <div
        className={`${styles.numberControl} ${unit ? styles.numberControlWithUnit : ""}`}
      >
        <input
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          className={styles.input}
          disabled={disabled}
          id={inputId}
          inputMode="decimal"
          max={max}
          min={min}
          name={name}
          onChange={(event) => onValueChange(event.currentTarget.value)}
          readOnly={readOnly}
          required={required}
          step={step}
          type="number"
          value={value}
        />
        {unit ? (
          <span aria-hidden="true" className={styles.numberUnit}>
            {unit}
          </span>
        ) : null}
      </div>
      {description ? (
        <p className={styles.description} id={descriptionId}>
          {description}
        </p>
      ) : null}
      {error ? (
        <p className={styles.error} id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
