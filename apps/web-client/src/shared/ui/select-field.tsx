"use client";

import { useId, type SelectHTMLAttributes } from "react";

export interface SelectOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> {
  readonly id?: string;
  readonly label: string;
  readonly description?: string;
  readonly error?: string;
  readonly placeholder?: string;
  readonly options: readonly SelectOption[];
}

export function SelectField({
  id,
  label,
  description,
  error,
  placeholder,
  options,
  className,
  required,
  ...selectProps
}: SelectFieldProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const descriptionId = `${selectId}-description`;
  const errorId = `${selectId}-error`;

  const describedBy = [
    description === undefined ? undefined : descriptionId,
    error === undefined ? undefined : errorId,
  ]
    .filter(Boolean)
    .join(" ");

  const classes = ["ui-control", "ui-select", className].filter(Boolean).join(" ");

  return (
    <div className="ui-field">
      <label className="ui-field__label" htmlFor={selectId}>
        {label}

        {required === true ? (
          <span className="ui-field__required" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>

      {description === undefined ? null : (
        <p className="ui-field__description" id={descriptionId}>
          {description}
        </p>
      )}

      <select
        {...selectProps}
        id={selectId}
        className={classes}
        required={required}
        aria-describedby={describedBy.length === 0 ? undefined : describedBy}
        aria-invalid={error === undefined ? undefined : true}
        aria-errormessage={error === undefined ? undefined : errorId}
      >
        {placeholder === undefined ? null : (
          <option value="" disabled>
            {placeholder}
          </option>
        )}

        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>

      {error === undefined ? null : (
        <p className="ui-field__error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
