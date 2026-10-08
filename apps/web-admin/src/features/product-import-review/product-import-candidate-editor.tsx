"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { getBrowserApiClient } from "@/shared/api/browser-api-client";
import {
  decideProductImportReview,
  getProductImportCandidate,
  reopenProductImportReview,
  startProductImportReview,
  updateProductImportReviewDraft,
  type JsonObject,
  type JsonValue,
  type ProductImportCandidateReviewDetails,
  type ProductImportReviewDecision,
} from "@/shared/api/product-import-review";
import { showErrorToast } from "@/shared/feedback/error-toast";
import { Button, Card, Modal, PageState, SelectField, TextInput } from "@/shared/ui";

import {
  IMPORT_DISPOSITION_LABELS,
  IMPORT_EVENT_LABELS,
  IMPORT_STATUS_LABELS,
  reasonCodeLabel,
} from "./product-import-labels";

export interface ProductImportCandidateEditorProps {
  readonly candidateId: string;
}

export function ProductImportCandidateEditor({ candidateId }: ProductImportCandidateEditorProps) {
  const apiClient = getBrowserApiClient();
  const query = useQuery({
    queryKey: ["admin-product-import-candidate", candidateId],
    queryFn: () => getProductImportCandidate(apiClient, candidateId),
  });

  if (query.isPending) {
    return <PageState kind="loading" title="Завантажуємо кандидата" />;
  }
  if (query.isError || query.data === undefined) {
    return (
      <PageState
        kind="error"
        title="Не вдалося відкрити кандидата"
        description="Перевірте API session або поверніться до черги."
        actions={
          <Link className="ui-button ui-button--secondary" href="/product-import">
            До черги
          </Link>
        }
      />
    );
  }

  return (
    <LoadedCandidateEditor
      key={query.data.data.candidate.updatedAt}
      details={query.data.data}
    />
  );
}

function LoadedCandidateEditor({
  details,
}: {
  readonly details: ProductImportCandidateReviewDetails;
}) {
  const apiClient = getBrowserApiClient();
  const queryClient = useQueryClient();
  const { candidate } = details;
  const draft = candidate.reviewDraft;
  const packageDraft = objectValue(draft.package);
  const gtinDraft = objectValue(draft.gtin);
  const nutritionDraft = objectValue(draft.nutritionFacts);
  const resolutionDraft = objectValue(draft.reviewResolution);
  const [form, setForm] = useState(() => ({
    title: stringValue(draft.title),
    description: stringValue(draft.description),
    brandName: stringValue(draft.brandName),
    rawProducerName: stringValue(draft.rawProducerName),
    gtin: stringValue(gtinDraft.normalized) || stringValue(gtinDraft.raw),
    packageKind: stringValue(packageDraft.kind) || "UNSPECIFIED",
    weightG: inputNumber(packageDraft.weightG),
    volumeMl: inputNumber(packageDraft.volumeMl),
    itemCount: inputNumber(packageDraft.itemCount),
    ingredients: stringArray(draft.ingredients).join("\n"),
    energy: stringValue(nutritionDraft.ingredient_energy),
    protein: stringValue(nutritionDraft.ingredient_protein),
    fat: stringValue(nutritionDraft.ingredient_fat),
    carbohydrates: stringValue(nutritionDraft.ingredient_carbohydrates),
    shelfLife: stringValue(draft.shelfLife),
    temperatureRange: stringValue(draft.temperatureRange),
    webUrl: stringValue(draft.webUrl),
    sourceImageUrl: stringValue(draft.sourceImageUrl),
    resolutionMode:
      stringValue(resolutionDraft.mode) === "ADD_PACKAGE_TO_EXISTING_PRODUCT"
        ? "ADD_PACKAGE_TO_EXISTING_PRODUCT"
        : "CREATE_NEW_PRODUCT",
    targetProductId: stringValue(resolutionDraft.targetProductId),
  }));
  const [decision, setDecision] = useState<ProductImportReviewDecision | null>(null);
  const [decisionComment, setDecisionComment] = useState("");

  async function refresh(response?: Awaited<ReturnType<typeof getProductImportCandidate>>) {
    if (response !== undefined) {
      queryClient.setQueryData(["admin-product-import-candidate", candidate.id], response);
    }
    await queryClient.invalidateQueries({ queryKey: ["admin-product-import-candidates"] });
  }

  const startMutation = useMutation({
    mutationFn: () => startProductImportReview(apiClient, candidate.id, candidate.updatedAt),
    onSuccess: async (response) => {
      toast.success("Перевірку розпочато");
      await refresh(response);
    },
    onError: showErrorToast,
  });
  const saveMutation = useMutation({
    mutationFn: (patch: JsonObject) =>
      updateProductImportReviewDraft(apiClient, candidate.id, candidate.updatedAt, patch),
    onSuccess: async (response) => {
      toast.success("Чернетку перевірки збережено");
      await refresh(response);
    },
    onError: showErrorToast,
  });
  const decisionMutation = useMutation({
    mutationFn: (value: ProductImportReviewDecision) =>
      decideProductImportReview(
        apiClient,
        candidate.id,
        candidate.updatedAt,
        value,
        decisionComment.trim() || undefined,
      ),
    onSuccess: async (response) => {
      toast.success("Рішення перевірки зафіксовано");
      setDecision(null);
      setDecisionComment("");
      await refresh(response);
    },
    onError: showErrorToast,
  });
  const reopenMutation = useMutation({
    mutationFn: () => reopenProductImportReview(apiClient, candidate.id, candidate.updatedAt),
    onSuccess: async (response) => {
      toast.success("Перевірку відкрито повторно");
      await refresh(response);
    },
    onError: showErrorToast,
  });

  function submitDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedGtin = form.gtin.trim();
    const patch: JsonObject = {
      title: nullable(form.title),
      description: nullable(form.description),
      brandName: nullable(form.brandName),
      rawProducerName: nullable(form.rawProducerName),
      gtin: {
        ...gtinDraft,
        raw: normalizedGtin || null,
        normalized: normalizedGtin || null,
        status: /^\d{8}$|^\d{12,14}$/.test(normalizedGtin) ? "VALID" : "INVALID",
      },
      package: {
        ...packageDraft,
        kind: form.packageKind,
        weightG: nullableNumber(form.weightG),
        volumeMl: nullableNumber(form.volumeMl),
        itemCount: nullableInteger(form.itemCount),
      },
      ingredients: form.ingredients
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean),
      nutritionFacts: {
        ...nutritionDraft,
        ingredient_energy: nullable(form.energy),
        ingredient_protein: nullable(form.protein),
        ingredient_fat: nullable(form.fat),
        ingredient_carbohydrates: nullable(form.carbohydrates),
      },
      shelfLife: nullable(form.shelfLife),
      temperatureRange: nullable(form.temperatureRange),
      webUrl: nullable(form.webUrl),
      sourceImageUrl: nullable(form.sourceImageUrl),
      reviewResolution: {
        mode: form.resolutionMode,
        targetProductId:
          form.resolutionMode === "ADD_PACKAGE_TO_EXISTING_PRODUCT"
            ? nullable(form.targetProductId)
            : null,
      },
    };
    saveMutation.mutate(patch);
  }

  const canEdit = candidate.status === "IN_REVIEW";
  const canStart = candidate.status === "PENDING" || candidate.status === "DEFERRED";
  const canReopen = candidate.status === "APPROVED" || candidate.status === "REJECTED";
  const imageUrl = form.sourceImageUrl || stringValue(candidate.sourceDraft.sourceImageUrl);

  return (
    <section className="admin-page import-review-page" aria-labelledby="candidate-title">
      <header className="import-review-page__header">
        <div>
          <p className="admin-page__eyebrow">Zakaz · SKU {candidate.sourceSku}</p>
          <h1 id="candidate-title">{candidate.title ?? "Кандидат без назви"}</h1>
          <div className="import-review-page__badges">
            <span className={`import-review-badge import-review-status--${candidate.status.toLowerCase()}`}>
              {IMPORT_STATUS_LABELS[candidate.status]}
            </span>
            <span className={`import-review-badge import-review-badge--${candidate.disposition.toLowerCase()}`}>
              {IMPORT_DISPOSITION_LABELS[candidate.disposition]}
            </span>
          </div>
        </div>
        <Link className="ui-button ui-button--secondary" href="/product-import">
          До черги
        </Link>
      </header>

      {candidate.reasonCodes.length === 0 ? null : (
        <Card className="import-review-warning">
          <h2>Причини ручної перевірки</h2>
          <ul>
            {candidate.reasonCodes.map((code) => (
              <li key={code}>{reasonCodeLabel(code)}</li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="import-review-toolbar">
        <div>
          <h2>Стан перевірки</h2>
          <p>
            {candidate.reviewedByEmail
              ? `Відповідальний: ${candidate.reviewedByEmail}`
              : "Кандидат ще не закріплений за адміністратором."}
          </p>
        </div>
        <div className="import-review-toolbar__actions">
          {canStart ? (
            <Button
              isLoading={startMutation.isPending}
              loadingLabel="Починаємо…"
              onClick={() => startMutation.mutate()}
            >
              Почати перевірку
            </Button>
          ) : null}
          {canReopen ? (
            <Button
              variant="secondary"
              isLoading={reopenMutation.isPending}
              onClick={() => reopenMutation.mutate()}
            >
              Відкрити повторно
            </Button>
          ) : null}
          {candidate.publishedProductId ? (
            <Link className="ui-button ui-button--secondary" href={`/products/${candidate.publishedProductId}`}>
              Переглянути продукт
            </Link>
          ) : null}
        </div>
      </Card>

      <div className="import-review-comparison">
        <Card className="import-review-source">
          <h2>Дані джерела</h2>
          {imageUrl ? (
            // Zakaz source image is shown only to an authenticated administrator.
            // eslint-disable-next-line @next/next/no-img-element
            <img className="import-review-source__image" src={imageUrl} alt="Зображення товару з Zakaz" />
          ) : null}
          <CandidateFacts draft={candidate.sourceDraft} candidate={candidate} />
          <details className="import-review-technical">
            <summary>Повні source snapshots і provenance</summary>
            <h3>Provenance</h3>
            <JsonPreview value={candidate.fieldProvenance} />
            <h3>Snapshots</h3>
            <JsonPreview value={candidate.sourceSnapshots} />
          </details>
        </Card>

        <form className="import-review-form" onSubmit={submitDraft}>
          <Card>
            <div className="import-review-section-heading">
              <div>
                <h2>Чернетка MealMind</h2>
                <p>Source snapshot залишається незмінним; редагується лише review draft.</p>
              </div>
              {!canEdit ? <span className="import-review-readonly">Лише перегляд</span> : null}
            </div>

            <div className="import-review-form__grid">
              <TextInput
                label="Назва"
                value={form.title}
                disabled={!canEdit}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
              <TextInput
                label="Бренд"
                value={form.brandName}
                disabled={!canEdit}
                onChange={(event) => setForm({ ...form, brandName: event.target.value })}
              />
              <TextInput
                label="Виробник із джерела"
                value={form.rawProducerName}
                disabled={!canEdit}
                onChange={(event) => setForm({ ...form, rawProducerName: event.target.value })}
              />
            </div>
            <TextareaField
              label="Опис"
              value={form.description}
              disabled={!canEdit}
              onChange={(value) => setForm({ ...form, description: value })}
            />
          </Card>

          <Card>
            <h2>GTIN і пакування</h2>
            <div className="import-review-form__grid">
              <TextInput
                label="GTIN"
                value={form.gtin}
                inputMode="numeric"
                disabled={!canEdit}
                onChange={(event) => setForm({ ...form, gtin: event.target.value })}
              />
              <SelectField
                label="Тип пакування"
                value={form.packageKind}
                disabled={!canEdit}
                options={[
                  { value: "UNSPECIFIED", label: "Не визначено" },
                  { value: "FIXED_MASS", label: "Фіксована вага" },
                  { value: "FIXED_VOLUME", label: "Фіксований об’єм" },
                  { value: "FIXED_COUNT", label: "Фіксована кількість" },
                  { value: "MIXED", label: "Комбіноване пакування" },
                ]}
                onChange={(event) => setForm({ ...form, packageKind: event.target.value })}
              />
              <TextInput
                label="Вага, г"
                type="number"
                min="0"
                step="0.0001"
                value={form.weightG}
                disabled={!canEdit}
                onChange={(event) => setForm({ ...form, weightG: event.target.value })}
              />
              <TextInput
                label="Об’єм, мл"
                type="number"
                min="0"
                step="0.0001"
                value={form.volumeMl}
                disabled={!canEdit}
                onChange={(event) => setForm({ ...form, volumeMl: event.target.value })}
              />
              <TextInput
                label="Кількість одиниць"
                type="number"
                min="1"
                step="1"
                value={form.itemCount}
                disabled={!canEdit}
                onChange={(event) => setForm({ ...form, itemCount: event.target.value })}
              />
            </div>
          </Card>

          <Card>
            <h2>Склад і поживна цінність</h2>
            <TextareaField
              label="Склад"
              description="Кожне source-значення розміщуйте з нового рядка."
              value={form.ingredients}
              disabled={!canEdit}
              onChange={(value) => setForm({ ...form, ingredients: value })}
            />
            <div className="import-review-form__grid">
              <TextInput label="Енергія" value={form.energy} disabled={!canEdit} onChange={(event) => setForm({ ...form, energy: event.target.value })} />
              <TextInput label="Білки" value={form.protein} disabled={!canEdit} onChange={(event) => setForm({ ...form, protein: event.target.value })} />
              <TextInput label="Жири" value={form.fat} disabled={!canEdit} onChange={(event) => setForm({ ...form, fat: event.target.value })} />
              <TextInput label="Вуглеводи" value={form.carbohydrates} disabled={!canEdit} onChange={(event) => setForm({ ...form, carbohydrates: event.target.value })} />
            </div>
          </Card>

          <Card>
            <h2>Пакування та source reference</h2>
            <div className="import-review-form__grid">
              <TextInput label="Строк придатності" value={form.shelfLife} disabled={!canEdit} onChange={(event) => setForm({ ...form, shelfLife: event.target.value })} />
              <TextInput label="Температурний діапазон" value={form.temperatureRange} disabled={!canEdit} onChange={(event) => setForm({ ...form, temperatureRange: event.target.value })} />
              <TextInput label="Zakaz URL" type="url" value={form.webUrl} disabled={!canEdit} onChange={(event) => setForm({ ...form, webUrl: event.target.value })} />
              <TextInput label="URL основного зображення" type="url" value={form.sourceImageUrl} disabled={!canEdit} onChange={(event) => setForm({ ...form, sourceImageUrl: event.target.value })} />
            </div>
          </Card>

          <Card>
            <h2>Майбутня публікація</h2>
            <p className="import-review-form__hint">
              Вибір зберігається у review draft. Фактичне створення продукту відбудеться окремою транзакцією.
            </p>
            <SelectField
              label="Рішення щодо продукту"
              value={form.resolutionMode}
              disabled={!canEdit}
              options={[
                { value: "CREATE_NEW_PRODUCT", label: "Створити новий продукт" },
                {
                  value: "ADD_PACKAGE_TO_EXISTING_PRODUCT",
                  label: "Додати пакування до наявного продукту",
                },
              ]}
              onChange={(event) => setForm({ ...form, resolutionMode: event.target.value })}
            />
            {form.resolutionMode === "ADD_PACKAGE_TO_EXISTING_PRODUCT" ? (
              <SelectField
                label="Наявний продукт"
                value={form.targetProductId}
                disabled={!canEdit}
                options={[
                  { value: "", label: "Оберіть продукт зі знайдених збігів" },
                  ...details.catalogMatches.map((match) => ({
                    value: match.productId,
                    label: `${match.name} · ${match.brandName ?? "без бренду"} · ${match.matchReason === "GTIN" ? "точний GTIN" : "схожий"}`,
                  })),
                ]}
                onChange={(event) => setForm({ ...form, targetProductId: event.target.value })}
              />
            ) : null}
            <CatalogMatches matches={details.catalogMatches} />
          </Card>

          {canEdit ? (
            <div className="import-review-form__actions">
              <Button type="submit" isLoading={saveMutation.isPending} loadingLabel="Зберігаємо…">
                Зберегти чернетку
              </Button>
              <Button variant="secondary" onClick={() => setDecision("DEFER")}>
                Відкласти
              </Button>
              <Button variant="danger" onClick={() => setDecision("REJECT")}>
                Відхилити
              </Button>
              <Button onClick={() => setDecision("APPROVE")}>Схвалити</Button>
            </div>
          ) : null}
        </form>
      </div>

      <AuditHistory events={candidate.events} />

      <Modal
        open={decision !== null}
        title={decision === null ? "Рішення перевірки" : decisionTitle(decision)}
        description="Рішення буде додано до незмінної історії кандидата. Схвалення не публікує продукт."
        onClose={() => {
          if (!decisionMutation.isPending) setDecision(null);
        }}
        footer={
          <>
            <Button variant="secondary" disabled={decisionMutation.isPending} onClick={() => setDecision(null)}>
              Скасувати
            </Button>
            <Button
              variant={decision === "REJECT" ? "danger" : "primary"}
              isLoading={decisionMutation.isPending}
              disabled={decision === "REJECT" && !decisionComment.trim()}
              onClick={() => {
                if (decision !== null) decisionMutation.mutate(decision);
              }}
            >
              Підтвердити
            </Button>
          </>
        }
      >
        <TextareaField
          label={decision === "REJECT" ? "Причина відхилення" : "Коментар"}
          description={decision === "REJECT" ? "Обов’язкове поле." : "Необов’язково."}
          value={decisionComment}
          required={decision === "REJECT"}
          onChange={setDecisionComment}
        />
      </Modal>
    </section>
  );
}

function CandidateFacts({
  draft,
  candidate,
}: {
  readonly draft: JsonObject;
  readonly candidate: ProductImportCandidateReviewDetails["candidate"];
}) {
  const packageDraft = objectValue(draft.package);
  const nutrition = objectValue(draft.nutritionFacts);
  return (
    <dl className="import-review-facts">
      <Fact label="Назва" value={stringValue(draft.title)} />
      <Fact label="Назва EN" value={stringValue(draft.sourceTitle)} />
      <Fact label="Бренд" value={stringValue(draft.brandName)} />
      <Fact label="Виробник" value={stringValue(draft.rawProducerName)} />
      <Fact label="GTIN" value={candidate.normalizedGtin ?? ""} />
      <Fact label="Тип пакування" value={stringValue(packageDraft.kind)} />
      <Fact label="Вага" value={unitValue(packageDraft.weightG, "г")} />
      <Fact label="Об’єм" value={unitValue(packageDraft.volumeMl, "мл")} />
      <Fact label="Кількість" value={unitValue(packageDraft.itemCount, "шт.")} />
      <Fact label="Строк придатності" value={stringValue(draft.shelfLife)} />
      <Fact label="Температура" value={stringValue(draft.temperatureRange)} />
      <Fact label="Енергія" value={stringValue(nutrition.ingredient_energy)} />
      <Fact label="Білки" value={stringValue(nutrition.ingredient_protein)} />
      <Fact label="Жири" value={stringValue(nutrition.ingredient_fat)} />
      <Fact label="Вуглеводи" value={stringValue(nutrition.ingredient_carbohydrates)} />
    </dl>
  );
}

function Fact({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}

function CatalogMatches({
  matches,
}: {
  readonly matches: ProductImportCandidateReviewDetails["catalogMatches"];
}) {
  return (
    <section className="import-review-matches" aria-labelledby="catalog-matches-title">
      <h3 id="catalog-matches-title">Збіги в каталозі</h3>
      {matches.length === 0 ? (
        <p>Точних або достатньо схожих продуктів не знайдено.</p>
      ) : (
        <ul>
          {matches.map((match) => (
            <li key={`${match.productId}:${match.packageId ?? "product"}`}>
              <div>
                <strong>{match.name}</strong>
                <span>
                  {match.brandName ?? "Без бренду"} · {match.categoryName} · GTIN {match.gtin ?? "—"}
                </span>
              </div>
              <div>
                <span className="import-review-badge">
                  {match.matchReason === "GTIN" ? "Точний GTIN" : "Схожий продукт"}
                </span>
                <Link href={`/products/${match.productId}`}>Відкрити</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AuditHistory({
  events,
}: {
  readonly events: ProductImportCandidateReviewDetails["candidate"]["events"];
}) {
  return (
    <Card className="import-review-history">
      <h2>Історія дій</h2>
      <ol>
        {[...events].reverse().map((event) => (
          <li key={event.id}>
            <div>
              <strong>{IMPORT_EVENT_LABELS[event.action] ?? event.action}</strong>
              <span>{formatDate(event.createdAt)}</span>
            </div>
            <p>
              {event.actorEmail ?? "Системний імпорт"}
              {event.fromStatus ? ` · ${IMPORT_STATUS_LABELS[event.fromStatus]} → ` : " · "}
              {IMPORT_STATUS_LABELS[event.toStatus]}
            </p>
            {event.comment ? <blockquote>{event.comment}</blockquote> : null}
          </li>
        ))}
      </ol>
    </Card>
  );
}

function JsonPreview({ value }: { readonly value: JsonValue }) {
  return <pre className="import-review-json">{JSON.stringify(value, null, 2)}</pre>;
}

function TextareaField({
  label,
  description,
  value,
  disabled = false,
  required = false,
  onChange,
}: {
  readonly label: string;
  readonly description?: string;
  readonly value: string;
  readonly disabled?: boolean;
  readonly required?: boolean;
  readonly onChange: (value: string) => void;
}) {
  return (
    <label className="ui-field">
      <span className="ui-field__label">
        {label}
        {required ? <span className="ui-field__required">*</span> : null}
      </span>
      {description ? <span className="ui-field__description">{description}</span> : null}
      <textarea
        className="ui-control import-review-textarea"
        value={value}
        disabled={disabled}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function objectValue(value: JsonValue | undefined): JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function stringValue(value: JsonValue | undefined): string {
  return typeof value === "string" ? value : "";
}

function stringArray(value: JsonValue | undefined): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function inputNumber(value: JsonValue | undefined): string {
  return typeof value === "number" || typeof value === "string" ? String(value) : "";
}

function nullable(value: string): string | null {
  return value.trim() || null;
}

function nullableNumber(value: string): number | null {
  const parsed = Number(value);
  return value.trim() && Number.isFinite(parsed) ? parsed : null;
}

function nullableInteger(value: string): number | null {
  const parsed = Number(value);
  return value.trim() && Number.isInteger(parsed) ? parsed : null;
}

function unitValue(value: JsonValue | undefined, unit: string): string {
  return typeof value === "number" || typeof value === "string" ? `${String(value)} ${unit}` : "";
}

function decisionTitle(decision: ProductImportReviewDecision): string {
  if (decision === "APPROVE") return "Схвалити кандидата";
  if (decision === "REJECT") return "Відхилити кандидата";
  return "Відкласти перевірку";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("uk-UA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Kyiv",
  }).format(new Date(value));
}
