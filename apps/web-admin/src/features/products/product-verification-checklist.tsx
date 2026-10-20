import type {
  ProductVerificationBlockingIssue,
  ProductVerificationReadiness,
  ProductVerificationWarning,
} from "@/shared/api/products";

const BLOCKING_LABELS: Readonly<Record<ProductVerificationBlockingIssue, string>> = {
  MISSING_UA_NAME: "Додайте українську назву",
  UNSPECIFIED_FOOD_STATE: "Оберіть загальний стан продукту",
  MISSING_ENERGY: "Додайте енергетичну цінність",
  MISSING_PROTEIN: "Додайте кількість білків",
  MISSING_TOTAL_FAT: "Додайте кількість жирів",
  MISSING_CARBOHYDRATE: "Додайте кількість вуглеводів",
  MISSING_BRAND: "Оберіть бренд",
  MISSING_ACTIVE_PACKAGE: "Додайте активне пакування",
  MISSING_PACKAGE_GTIN: "Додайте GTIN активного пакування",
  MISSING_PACKAGE_QUANTITY: "Вкажіть вагу, об’єм або кількість у пакуванні",
};

const WARNING_LABELS: Readonly<Record<ProductVerificationWarning, string>> = {
  MISSING_PRIMARY_IMAGE: "Рекомендовано додати основне фото",
  MISSING_DEFAULT_PORTION: "Рекомендовано визначити типову порцію",
};

interface ProductVerificationChecklistProps {
  readonly readiness: ProductVerificationReadiness;
  readonly verifiedAt: string | null;
}

export function ProductVerificationChecklist({
  readiness,
  verifiedAt,
}: ProductVerificationChecklistProps) {
  const isReady = readiness.status === "READY";

  return (
    <section
      className={`product-verification-card product-verification-card--${readiness.status.toLowerCase()}`}
      aria-labelledby="product-verification-title"
    >
      <div>
        <p className="product-verification-card__eyebrow">Перевірка каталогу</p>
        <h2 id="product-verification-title">
          {isReady ? "Обов’язкові дані заповнено" : "Продукт потрібно доповнити"}
        </h2>
        <p>
          {isReady
            ? "Продукт можна позначити як перевірений. Рекомендації не блокують верифікацію."
            : "Статус «Перевірено» стане доступним після усунення всіх блокувальних пунктів."}
        </p>
        {verifiedAt === null ? null : (
          <p className="product-verification-card__meta">
            Востаннє перевірено:{" "}
            {new Intl.DateTimeFormat("uk-UA", { dateStyle: "medium", timeStyle: "short" }).format(
              new Date(verifiedAt),
            )}
          </p>
        )}
      </div>

      {readiness.blockingIssues.length === 0 ? null : (
        <ul className="product-verification-card__list product-verification-card__list--blocking">
          {readiness.blockingIssues.map((issue) => (
            <li key={issue}>{BLOCKING_LABELS[issue]}</li>
          ))}
        </ul>
      )}

      {readiness.warnings.length === 0 ? null : (
        <ul className="product-verification-card__list">
          {readiness.warnings.map((warning) => (
            <li key={warning}>{WARNING_LABELS[warning]}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
