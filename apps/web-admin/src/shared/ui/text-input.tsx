"use client";

import { useId, type InputHTMLAttributes } from "react";

export interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  readonly id?: string;
  readonly label: string;
  readonly description?: string;
  readonly error?: string;
}

export function TextInput({
  id,
  label,
  description,
  error,
  className,
  required,
  type = "text",
  ...inputProps
}: TextInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = `${inputId}-description`;
  const errorId = `${inputId}-error`;

  const describedBy = [
    description === undefined ? undefined : descriptionId,
    error === undefined ? undefined : errorId,
  ]
    .filter(Boolean)
    .join(" ");

  const classes = ["ui-control", className].filter(Boolean).join(" ");

  return (
    <div className="ui-field">
      <label className="ui-field__label" htmlFor={inputId}>
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

      <input
        {...inputProps}
        id={inputId}
        type={type}
        className={classes}
        required={required}
        aria-describedby={describedBy.length === 0 ? undefined : describedBy}
        aria-invalid={error === undefined ? undefined : true}
        aria-errormessage={error === undefined ? undefined : errorId}
      />

      {error === undefined ? null : (
        <p className="ui-field__error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
