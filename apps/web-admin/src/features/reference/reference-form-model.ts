import type { ReferenceItem, ReferenceWriteData } from "@/shared/api/reference-data";

import type { ReferenceConfig } from "./reference-config";

export type ReferenceFormValues = Record<string, string | boolean>;
export type ReferenceFormErrors = Readonly<Record<string, string>>;

export function initialReferenceValues(
  config: ReferenceConfig,
  item?: ReferenceItem,
): ReferenceFormValues {
  return Object.fromEntries(
    config.fields.map((field) => {
      const value = item?.[field.name];
      if (field.kind === "checkbox") {
        return [field.name, value === undefined ? defaultBoolean(field.name) : value === true];
      }
      return [
        field.name,
        value === null || value === undefined ? defaultValue(field.name) : String(value),
      ];
    }),
  );
}

export function validateReferenceValues(
  config: ReferenceConfig,
  values: ReferenceFormValues,
  mode: "create" | "edit",
): ReferenceFormErrors {
  const errors: Record<string, string> = {};
  for (const field of config.fields) {
    if (mode === "edit" && field.createOnly === true) continue;
    const value = values[field.name];
    if (field.required === true && (typeof value !== "string" || value.trim() === "")) {
      errors[field.name] = "Поле обов’язкове";
      continue;
    }
    if (typeof value !== "string" || value.trim() === "") continue;
    if (field.name === "code" && !/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(value)) {
      errors[field.name] = "Використовуйте lowercase_snake_case";
    }
    if (field.name === "slug" && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
      errors[field.name] = "Використовуйте lowercase-kebab-case";
    }
    if (field.name === "countryCode" && !/^[A-Za-z]{2}$/.test(value)) {
      errors[field.name] = "Вкажіть дволітерний код країни";
    }
    if (field.kind === "number" && !/^\d+$/.test(value)) {
      errors[field.name] = "Вкажіть ціле невід’ємне число";
    }
    if (field.kind === "decimal" && (!/^\d+(?:\.\d{1,9})?$/.test(value) || Number(value) <= 0)) {
      errors[field.name] = "Вкажіть додатне число з крапкою";
    }
    if (field.kind === "url") {
      try {
        const url = new URL(value);
        if (!["http:", "https:"].includes(url.protocol)) throw new Error();
      } catch {
        errors[field.name] = "Вкажіть коректну HTTP(S) адресу";
      }
    }
  }
  return errors;
}

export function toReferenceWriteData(
  config: ReferenceConfig,
  values: ReferenceFormValues,
  mode: "create" | "edit",
): ReferenceWriteData {
  const entries: Array<[string, unknown]> = [];
  for (const field of config.fields) {
    if (mode === "edit" && field.createOnly === true) continue;
    const value = values[field.name];
    if (field.kind === "checkbox") {
      entries.push([field.name, value === true]);
      continue;
    }
    const normalized = typeof value === "string" ? value.trim() : "";
    if (normalized === "" && field.nullable === true) {
      entries.push([field.name, null]);
      continue;
    }
    entries.push([
      field.name,
      field.kind === "number"
        ? Number(normalized)
        : field.name === "countryCode"
          ? normalized.toUpperCase()
          : normalized,
    ]);
  }
  return Object.fromEntries(entries);
}

function defaultValue(field: string): string {
  if (field === "status") return "DRAFT";
  if (field === "verificationStatus") return "UNVERIFIED";
  if (field === "displayLevel") return "EXTENDED";
  if (field === "sortOrder") return "0";
  if (field === "factorToBaseUnit") return "1";
  return "";
}

function defaultBoolean(field: string): boolean {
  return ["isActive", "isAssignable", "isPreferenceSelectable"].includes(field);
}
