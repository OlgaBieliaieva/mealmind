"use client";

import { useState, type FormEvent } from "react";

import type { ReferenceItem, ReferenceWriteData } from "@/shared/api/reference-data";
import { Button, SelectField, TextInput } from "@/shared/ui";

import type { ReferenceConfig, ReferenceOption } from "./reference-config";
import {
  initialReferenceValues,
  toReferenceWriteData,
  validateReferenceValues,
  type ReferenceFormErrors,
  type ReferenceFormValues,
} from "./reference-form-model";

export interface ReferenceFormProps {
  readonly config: ReferenceConfig;
  readonly mode: "create" | "edit";
  readonly item?: ReferenceItem;
  readonly categoryOptions?: readonly ReferenceOption[];
  readonly isSubmitting?: boolean;
  readonly submitError?: string | undefined;
  readonly onSubmit: (data: ReferenceWriteData) => Promise<void>;
  readonly onCancel: () => void;
}

export function ReferenceForm({
  config,
  mode,
  item,
  categoryOptions = [],
  isSubmitting = false,
  submitError,
  onSubmit,
  onCancel,
}: ReferenceFormProps) {
  const [values, setValues] = useState<ReferenceFormValues>(() =>
    initialReferenceValues(config, item),
  );
  const [errors, setErrors] = useState<ReferenceFormErrors>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateReferenceValues(config, values, mode);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    try {
      await onSubmit(toReferenceWriteData(config, values, mode));
    } catch {
      // The parent mutation owns the stable API error state rendered below the form.
    }
  }

  function setValue(field: string, value: string | boolean) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (current[field] === undefined) return current;
      return Object.fromEntries(Object.entries(current).filter(([name]) => name !== field));
    });
  }

  return (
    <form className="reference-form" onSubmit={(event) => void submit(event)} noValidate>
      <div className="reference-form__grid">
        {config.fields.map((field) => {
          if (mode === "edit" && field.createOnly === true) return null;
          const value = values[field.name];
          const error = errors[field.name];
          const id = `reference-field-${field.name}`;

          if (field.kind === "checkbox") {
            return (
              <label className="reference-form__checkbox" key={field.name}>
                <input
                  type="checkbox"
                  checked={value === true}
                  onChange={(event) => setValue(field.name, event.target.checked)}
                />
                {field.label}
              </label>
            );
          }

          if (field.kind === "select") {
            const options =
              field.name === "parentCategoryId" ? categoryOptions : (field.options ?? []);
            return (
              <SelectField
                id={id}
                key={field.name}
                label={field.label}
                {...(field.required === undefined ? {} : { required: field.required })}
                options={options}
                value={typeof value === "string" ? value : ""}
                {...(error === undefined ? {} : { error })}
                {...(field.description === undefined ? {} : { description: field.description })}
                onChange={(event) => setValue(field.name, event.target.value)}
              />
            );
          }

          if (field.kind === "textarea") {
            const errorId = `${id}-error`;
            return (
              <div className="ui-field reference-form__wide" key={field.name}>
                <label className="ui-field__label" htmlFor={id}>
                  {field.label}
                </label>
                <textarea
                  id={id}
                  className="ui-control reference-form__textarea"
                  maxLength={field.maxLength}
                  value={typeof value === "string" ? value : ""}
                  aria-invalid={error === undefined ? undefined : true}
                  aria-errormessage={error === undefined ? undefined : errorId}
                  onChange={(event) => setValue(field.name, event.target.value)}
                />
                {error === undefined ? null : (
                  <p className="ui-field__error" id={errorId} role="alert">
                    {error}
                  </p>
                )}
              </div>
            );
          }

          return (
            <TextInput
              id={id}
              key={field.name}
              label={field.label}
              type={field.kind === "url" ? "url" : "text"}
              inputMode={
                field.kind === "number"
                  ? "numeric"
                  : field.kind === "decimal"
                    ? "decimal"
                    : undefined
              }
              {...(field.required === undefined ? {} : { required: field.required })}
              {...(field.maxLength === undefined ? {} : { maxLength: field.maxLength })}
              {...(field.description === undefined ? {} : { description: field.description })}
              {...(error === undefined ? {} : { error })}
              value={typeof value === "string" ? value : ""}
              onChange={(event) => setValue(field.name, event.target.value)}
            />
          );
        })}
      </div>

      {submitError === undefined ? null : (
        <p className="reference-form__error" role="alert">
          {submitError}
        </p>
      )}

      <div className="reference-form__actions">
        <Button type="submit" isLoading={isSubmitting} loadingLabel="Зберігаємо…">
          {mode === "create" ? "Створити" : "Зберегти зміни"}
        </Button>
        <Button variant="secondary" disabled={isSubmitting} onClick={onCancel}>
          Скасувати
        </Button>
      </div>
    </form>
  );
}
