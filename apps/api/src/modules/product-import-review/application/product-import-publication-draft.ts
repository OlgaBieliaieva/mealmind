import { ProductImportReviewInvariantError } from "./product-import-review-errors.js";
import type { ProductImportPublicationDraft } from "../domain/product-import-publisher.js";
import type {
  JsonObject,
  JsonValue,
  ProductImportCandidateDetails,
} from "../domain/product-import-review-repository.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PACKAGE_KINDS = new Set([
  "UNSPECIFIED",
  "FIXED_MASS",
  "FIXED_VOLUME",
  "FIXED_MASS_AND_VOLUME",
  "FIXED_COUNT",
]);

export function parseProductImportPublicationDraft(
  candidate: ProductImportCandidateDetails,
): ProductImportPublicationDraft {
  const draft = candidate.reviewDraft;
  const resolution = objectValue(draft.reviewResolution);
  const canonical = objectValue(draft.canonical);
  const mode =
    stringValue(resolution.mode) === "ADD_PACKAGE_TO_EXISTING_PRODUCT"
      ? "ADD_PACKAGE_TO_EXISTING_PRODUCT"
      : "CREATE_NEW_PRODUCT";
  const targetProductId = nullableUuid(resolution.targetProductId);
  if (mode === "ADD_PACKAGE_TO_EXISTING_PRODUCT" && targetProductId === null) {
    invalid("Оберіть продукт, до якого потрібно додати пакування");
  }

  const nameEn =
    nullableString(canonical.nameEn) ??
    nullableString(draft.sourceTitle) ??
    nullableString(draft.title);
  if (nameEn === null) invalid("Вкажіть канонічну англійську назву продукту");

  const categoryId = nullableUuid(canonical.categoryId);
  const brandId = nullableUuid(canonical.brandId);
  const defaultMeasurementUnitId = nullableUuid(canonical.defaultMeasurementUnitId);
  if (mode === "CREATE_NEW_PRODUCT") {
    if (categoryId === null) invalid("Оберіть канонічну категорію продукту");
    if (brandId === null) invalid("Оберіть канонічний бренд продукту");
    if (defaultMeasurementUnitId === null) invalid("Оберіть базову одиницю продукту");
  }

  const gtinDraft = objectValue(draft.gtin);
  const gtinValue =
    nullableString(gtinDraft.normalized) ??
    nullableString(gtinDraft.raw) ??
    candidate.normalizedGtin;
  const gtin = gtinValue === null ? null : normalizeGtin(gtinValue);
  const packageDraft = objectValue(draft.package);
  const kindValue = stringValue(packageDraft.kind) ?? "UNSPECIFIED";
  if (!PACKAGE_KINDS.has(kindValue)) invalid("Оберіть коректний тип пакування");

  const weightG = positiveNumber(packageDraft.weightG, "Вага пакування");
  const volumeMl = positiveNumber(packageDraft.volumeMl, "Об’єм пакування");
  const itemCount = positiveInteger(packageDraft.itemCount, "Кількість у пакуванні");
  assertPackageShape(kindValue, weightG, volumeMl, itemCount);

  const nutrition = objectValue(draft.nutritionFacts);
  const nutrients = [
    nutrient("energy_kcal", nutrition.ingredient_energy),
    nutrient("protein", nutrition.ingredient_protein),
    nutrient("total_fat", nutrition.ingredient_fat),
    nutrient("carbohydrate", nutrition.ingredient_carbohydrates),
  ].filter((value): value is NonNullable<typeof value> => value !== null);

  const shelfRaw = nullableString(draft.shelfLife);
  const temperatureRaw = nullableString(draft.temperatureRange);
  const shelf = parseShelfLife(shelfRaw);
  const temperature = parseTemperatureRange(temperatureRaw);
  const availability = objectValue(draft.availability);

  return Object.freeze({
    mode,
    targetProductId,
    nameEn,
    nameUa: nullableString(canonical.nameUa) ?? nullableString(draft.title),
    categoryId,
    brandId,
    defaultMeasurementUnitId,
    baseProductId: nullableUuid(canonical.baseProductId),
    description: nullableString(draft.description),
    gtin,
    package: Object.freeze({
      kind: kindValue as ProductImportPublicationDraft["package"]["kind"],
      weightG,
      volumeMl,
      itemCount,
    }),
    ingredients: Object.freeze(stringArray(draft.ingredients)),
    nutrients: Object.freeze(nutrients),
    shelfLife: Object.freeze({
      raw: shelfRaw,
      durationValue: shelf.value,
      durationUnit: shelf.unit,
    }),
    temperatureRange: Object.freeze({
      raw: temperatureRaw,
      minC: temperature.min,
      maxC: temperature.max,
    }),
    webUrl: nullableString(draft.webUrl),
    sourceImageUrl: nullableString(draft.sourceImageUrl),
    rawProducerName: nullableString(draft.rawProducerName),
    inStock: booleanValue(availability.inStock),
  });
}

function normalizeGtin(value: string): string {
  const digits = value.trim();
  if (!/^\d{8}$|^\d{12,14}$/.test(digits)) invalid("GTIN має містити 8, 12, 13 або 14 цифр");
  return digits.padStart(14, "0");
}

function assertPackageShape(
  kind: string,
  weightG: number | null,
  volumeMl: number | null,
  itemCount: number | null,
): void {
  if (kind === "FIXED_MASS" && weightG === null) invalid("Для вагового пакування вкажіть вагу");
  if (kind === "FIXED_VOLUME" && volumeMl === null)
    invalid("Для об’ємного пакування вкажіть об’єм");
  if (kind === "FIXED_MASS_AND_VOLUME" && (weightG === null || volumeMl === null)) {
    invalid("Для комбінованого пакування вкажіть вагу й об’єм");
  }
  if (kind === "FIXED_COUNT" && itemCount === null) {
    invalid("Для штучного пакування вкажіть кількість");
  }
}

function nutrient(
  code: ProductImportPublicationDraft["nutrients"][number]["code"],
  value: JsonValue | undefined,
) {
  const parsed = decimalFromLabel(value);
  return parsed === null ? null : Object.freeze({ code, valuePer100g: parsed });
}

function decimalFromLabel(value: JsonValue | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : null;
  if (typeof value !== "string" || value.trim() === "") return null;
  const match = value.replace(",", ".").match(/\d+(?:\.\d+)?/);
  if (match === null) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function parseShelfLife(raw: string | null): {
  readonly value: number | null;
  readonly unit: "HOURS" | "DAYS" | "MONTHS" | "YEARS" | null;
} {
  if (raw === null) return { value: null, unit: null };
  const match = raw
    .toLowerCase()
    .replace(",", ".")
    .match(/(\d+(?:\.\d+)?)\s*([^\d]*)/u);
  if (match === null) return { value: null, unit: null };
  const value = Number(match[1]);
  const suffix = match[2] ?? "";
  const unit = /год|hour|hr/u.test(suffix)
    ? "HOURS"
    : /дн|діб|day/u.test(suffix)
      ? "DAYS"
      : /міс|month/u.test(suffix)
        ? "MONTHS"
        : /рік|рок|year/u.test(suffix)
          ? "YEARS"
          : null;
  return { value: Number.isFinite(value) && unit !== null ? value : null, unit };
}

function parseTemperatureRange(raw: string | null): {
  readonly min: number | null;
  readonly max: number | null;
} {
  if (raw === null) return { min: null, max: null };
  const values = [...raw.replaceAll(",", ".").matchAll(/-?\d+(?:\.\d+)?/g)].map((match) =>
    Number(match[0]),
  );
  if (values.length < 2 || values.some((value) => !Number.isFinite(value))) {
    return { min: null, max: null };
  }
  return { min: Math.min(values[0]!, values[1]!), max: Math.max(values[0]!, values[1]!) };
}

function objectValue(value: JsonValue | undefined): JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function stringValue(value: JsonValue | undefined): string | null {
  return typeof value === "string" ? value : null;
}

function nullableString(value: JsonValue | undefined): string | null {
  const string = stringValue(value)?.trim();
  return string ? string : null;
}

function nullableUuid(value: JsonValue | undefined): string | null {
  const string = nullableString(value);
  if (string === null) return null;
  if (!UUID.test(string)) invalid("Canonical reference має некоректний UUID");
  return string;
}

function positiveNumber(value: JsonValue | undefined, label: string): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) invalid(label + " має бути додатним числом");
  return parsed;
}

function positiveInteger(value: JsonValue | undefined, label: string): number | null {
  const parsed = positiveNumber(value, label);
  if (parsed !== null && !Number.isInteger(parsed)) invalid(label + " має бути цілим числом");
  return parsed;
}

function stringArray(value: JsonValue | undefined): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function booleanValue(value: JsonValue | undefined): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function invalid(message: string): never {
  throw new ProductImportReviewInvariantError(message);
}
