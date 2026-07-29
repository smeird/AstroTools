"use client";

import { useId } from "react";

import styles from "./field.module.css";
import { fieldDescriptionIds } from "./field-message";
import type { FieldProps } from "./field-types";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string> extends FieldProps {
  name: string;
  value: T;
  options: readonly SegmentOption<T>[];
  onValueChange(value: T): void;
}

export function SegmentedControl<T extends string>({
  id,
  label,
  description,
  error,
  disabled,
  required,
  name,
  value,
  options,
  onValueChange,
}: SegmentedControlProps<T>) {
  const generatedId = useId();
  const groupId = id ?? generatedId;
  const descriptionId = `${groupId}-description`;
  const errorId = `${groupId}-error`;
  const describedBy = fieldDescriptionIds(
    description,
    error,
    descriptionId,
    errorId,
  );

  return (
    <fieldset
      aria-describedby={describedBy}
      aria-invalid={Boolean(error)}
      className={styles.fieldset}
      disabled={disabled}
      id={groupId}
    >
      <legend className={styles.legend}>{label}</legend>
      <div className={styles.segments}>
        {options.map((option) => (
          <label className={styles.segment} key={option.value}>
            <input
              checked={value === option.value}
              disabled={option.disabled}
              name={name}
              onChange={() => onValueChange(option.value)}
              required={required}
              type="radio"
              value={option.value}
            />
            <span className={styles.segmentContent}>
              <span aria-hidden="true" className={styles.selectedMark}>
                {value === option.value ? "✓" : ""}
              </span>
              <span>{option.label}</span>
            </span>
          </label>
        ))}
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
    </fieldset>
  );
}
