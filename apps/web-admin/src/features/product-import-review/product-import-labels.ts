import type {
  ProductImportCandidateDisposition,
  ProductImportCandidateStatus,
} from "@/shared/api/product-import-review";

export const IMPORT_STATUS_LABELS: Readonly<Record<ProductImportCandidateStatus, string>> = {
  PENDING: "Очікує перевірки",
  IN_REVIEW: "На перевірці",
  APPROVED: "Схвалено",
  REJECTED: "Відхилено",
  DEFERRED: "Відкладено",
  PUBLISHED: "Опубліковано",
};

export const IMPORT_DISPOSITION_LABELS: Readonly<
  Record<ProductImportCandidateDisposition, string>
> = {
  CANDIDATE: "Готовий кандидат",
  REVIEW_REQUIRED: "Потребує уваги",
  REJECTED: "Відхилено pipeline",
};

export const IMPORT_EVENT_LABELS: Readonly<Record<string, string>> = {
  IMPORTED: "Імпортовано",
  REVIEW_STARTED: "Перевірку розпочато",
  UPDATED: "Чернетку оновлено",
  APPROVED: "Схвалено",
  REJECTED: "Відхилено",
  DEFERRED: "Відкладено",
  REOPENED: "Перевірку відкрито повторно",
  PUBLISHED: "Опубліковано",
};

export function reasonCodeLabel(code: string): string {
  return (
    {
      PACKAGE_MEASURE_MISSING: "Не визначено обсяг пакування",
      PACKAGE_VARIABLE_WEIGHT: "Ваговий товар",
      DUPLICATE_NORMALIZED_GTIN: "GTIN повторюється серед кандидатів",
      LOCALIZATION_MISSING: "Відсутня українська локалізація",
      LOCALIZED_TITLE_MISSING: "Відсутня українська назва",
      MATCH_IDENTITY_CONFLICT: "Конфлікт EN/UK зіставлення",
      SOURCE_CLASSIFICATION_MISSING: "Відсутня source-класифікація",
    }[code] ?? code.replaceAll("_", " ").toLocaleLowerCase("uk-UA")
  );
}
