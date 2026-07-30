"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import styles from "./field.module.css";
import { fieldDescriptionIds } from "./field-message";
import type { FieldProps } from "./field-types";

export interface ComboboxOption {
  value: string;
  label: string;
  searchText?: string;
  disabled?: boolean;
}

export interface ComboboxProps extends FieldProps {
  name: string;
  query: string;
  selectedValue: string | null;
  options: readonly ComboboxOption[];
  noResultsText?: string;
  onQueryChange(query: string): void;
  onSelectionChange(value: string | null): void;
}

function normalise(value: string): string {
  return value.trim().toLocaleLowerCase("en-GB");
}

export function Combobox({
  id,
  label,
  description,
  error,
  disabled,
  required,
  name,
  query,
  selectedValue,
  options,
  noResultsText = "No matching options",
  onQueryChange,
  onSelectionChange,
}: ComboboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const listboxId = `${inputId}-listbox`;
  const descriptionId = `${inputId}-description`;
  const errorId = `${inputId}-error`;
  const [open, setOpen] = useState(false);
  const [activeValue, setActiveValue] = useState<string | null>(null);
  const [selectionAtOpen, setSelectionAtOpen] = useState<string | null>(null);
  const optionRefs = useRef(new Map<string, HTMLLIElement>());
  const filteredOptions = useMemo(() => {
    const needle = normalise(query);
    const selectedLabel = options.find(
      (option) => option.value === selectedValue,
    )?.label;

    if (!needle || normalise(selectedLabel ?? "") === needle) {
      return options;
    }

    return options.filter((option) =>
      normalise(`${option.label} ${option.searchText ?? ""}`).includes(needle),
    );
  }, [options, query, selectedValue]);
  const enabledOptions = filteredOptions.filter((option) => !option.disabled);
  const activeOption = enabledOptions.find(
    (option) => option.value === activeValue,
  );
  const activeOptionId = activeOption
    ? `${inputId}-option-${activeOption.value}`
    : undefined;
  const describedBy = fieldDescriptionIds(
    description,
    error,
    descriptionId,
    errorId,
  );

  useEffect(() => {
    if (!open || !activeValue) {
      return;
    }

    const activeElement = optionRefs.current.get(activeValue);
    if (typeof activeElement?.scrollIntoView === "function") {
      activeElement.scrollIntoView({ block: "nearest" });
    }
  }, [activeValue, open]);

  function openWithValue(value: string | null) {
    setOpen(true);
    setActiveValue(
      enabledOptions.some((option) => option.value === value)
        ? value
        : (enabledOptions[0]?.value ?? null),
    );
  }

  function moveActive(direction: 1 | -1) {
    if (enabledOptions.length === 0) {
      setActiveValue(null);
      return;
    }

    const currentIndex = enabledOptions.findIndex(
      (option) => option.value === activeValue,
    );
    const startIndex =
      currentIndex < 0 ? (direction === 1 ? -1 : 0) : currentIndex;
    const nextIndex =
      (startIndex + direction + enabledOptions.length) % enabledOptions.length;

    setActiveValue(enabledOptions[nextIndex]?.value ?? null);
  }

  function selectOption(option: ComboboxOption) {
    if (option.disabled) {
      return;
    }

    onSelectionChange(option.value);
    onQueryChange(option.label);
    setSelectionAtOpen(option.value);
    setActiveValue(option.value);
    setOpen(false);
  }

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
      </label>
      <div className={styles.combobox}>
        <input
          aria-activedescendant={open ? activeOptionId : undefined}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-describedby={describedBy}
          aria-expanded={open}
          aria-invalid={Boolean(error)}
          aria-required={required}
          autoComplete="off"
          className={styles.comboboxInput}
          disabled={disabled}
          id={inputId}
          name={name}
          onBlur={() => setOpen(false)}
          onChange={(event) => {
            const nextQuery = event.currentTarget.value;
            const needle = normalise(nextQuery);
            const nextEnabled = options.filter(
              (option) =>
                !option.disabled &&
                normalise(
                  `${option.label} ${option.searchText ?? ""}`,
                ).includes(needle),
            );

            onQueryChange(nextQuery);
            onSelectionChange(null);
            setOpen(true);
            setActiveValue(nextEnabled[0]?.value ?? null);
          }}
          onFocus={() => {
            setSelectionAtOpen(selectedValue);
            openWithValue(selectedValue);
          }}
          onKeyDown={(event) => {
            switch (event.key) {
              case "ArrowDown":
                event.preventDefault();
                if (!open) {
                  openWithValue(selectedValue);
                } else {
                  moveActive(1);
                }
                break;
              case "ArrowUp":
                event.preventDefault();
                if (!open) {
                  openWithValue(selectedValue);
                } else {
                  moveActive(-1);
                }
                break;
              case "Enter": {
                if (!open) {
                  break;
                }

                event.preventDefault();
                const option = enabledOptions.find(
                  (candidate) => candidate.value === activeValue,
                );
                if (option) {
                  selectOption(option);
                }
                break;
              }
              case "Escape": {
                if (!open) {
                  break;
                }

                event.preventDefault();
                const selectedOption = options.find(
                  (option) => option.value === selectionAtOpen,
                );
                if (selectedValue !== selectionAtOpen) {
                  onSelectionChange(selectionAtOpen);
                }
                onQueryChange(selectedOption?.label ?? "");
                setActiveValue(selectionAtOpen);
                setOpen(false);
                break;
              }
            }
          }}
          role="combobox"
          type="text"
          value={query}
        />
        <span aria-hidden="true" className={styles.comboboxChevron}>
          {open ? "↑" : "↓"}
        </span>
        {open ? (
          <ul
            className={styles.listbox}
            id={listboxId}
            role="listbox"
            tabIndex={-1}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const active = option.value === activeOption?.value;
                const selected = option.value === selectedValue;
                const classNames = [
                  styles.option,
                  active ? styles.optionActive : "",
                  option.disabled ? styles.optionDisabled : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <li
                    aria-disabled={option.disabled || undefined}
                    aria-selected={selected}
                    className={classNames}
                    id={`${inputId}-option-${option.value}`}
                    key={option.value}
                    onClick={() => selectOption(option)}
                    onMouseDown={(event) => event.preventDefault()}
                    ref={(element) => {
                      if (element) {
                        optionRefs.current.set(option.value, element);
                      } else {
                        optionRefs.current.delete(option.value);
                      }
                    }}
                    role="option"
                  >
                    <span aria-hidden="true" className={styles.optionMarker}>
                      {active ? "›" : ""}
                    </span>
                    <span>{option.label}</span>
                    {selected ? (
                      <span
                        aria-hidden="true"
                        className={styles.optionSelected}
                      >
                        ✓
                      </span>
                    ) : null}
                  </li>
                );
              })
            ) : (
              <li className={styles.empty}>{noResultsText}</li>
            )}
          </ul>
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
