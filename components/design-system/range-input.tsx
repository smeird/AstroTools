"use client";

import { useId } from "react";

import styles from "./field.module.css";
import { fieldDescriptionIds } from "./field-message";
import type { FieldProps } from "./field-types";

export interface RangeInputProps extends FieldProps {
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
  valueText?: string;
  onValueChange(value: number): void;
}

export function RangeInput({
  id,
  label,
  description,
  error,
  disabled,
  required,
  name,
  value,
  min,
  max,
  step,
  valueText,
  onValueChange,
}: RangeInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = `${inputId}-description`;
  const errorId = `${inputId}-error`;
  const describedBy = fieldDescriptionIds(
    description,
    error,
    descriptionId,
    errorId,
  );

  return (
    <div className={styles.field}>
      <div className={styles.labelRow}>
        <label className={styles.label} htmlFor={inputId}>
          {label}
        </label>
        <span aria-hidden="true" className={styles.output}>
          {valueText ?? value}
        </span>
      </div>
      <input
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
        aria-valuetext={valueText}
        className={styles.range}
        disabled={disabled}
        id={inputId}
        max={max}
        min={min}
        name={name}
        onChange={(event) => onValueChange(event.currentTarget.valueAsNumber)}
        required={required}
        step={step}
        type="range"
        value={value}
      />
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
