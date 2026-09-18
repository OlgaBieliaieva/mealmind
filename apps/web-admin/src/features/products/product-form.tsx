"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";

import { getUserFacingErrorMessage } from "@/shared/api/api-error";
import type { ProductDetails } from "@/shared/api/products";
import type { ReferenceWriteData } from "@/shared/api/reference-data";
import { Button, Modal, SelectField, TextInput } from "@/shared/ui";

import { REFERENCE_CONFIGS } from "../reference/reference-config";
import { ReferenceForm } from "../reference/reference-form";
import { BarcodeScanner } from "./barcode-scanner";
import { BaseProductSearch, type BaseProductOption } from "./base-product-search";
import { PRODUCT_FOOD_STATE_LABELS, PRODUCT_TYPE_LABELS } from "./product-labels";
import {
  EMPTY_PRODUCT_FORM,
  productFormSchema,
  type ProductFormValues,
} from "./product-form-schema";
import { useDirtyFormGuard } from "./use-dirty-form-guard";

export interface ProductOption {
  readonly value: string;
  readonly label: string;
  readonly unit?: string;
}

export interface ProductFormProps {
  readonly mode: "create" | "edit";
  readonly initialValues?: ProductFormValues;
  readonly categories: readonly ProductOption[];
  readonly measurementUnits: readonly ProductOption[];
  readonly brands: readonly ProductOption[];
  readonly genericProducts: readonly ProductOption[];
  readonly nutrients: readonly ProductOption[];
  readonly isSubmitting?: boolean;
  readonly onSearchGenericProducts: (query: string) => Promise<readonly BaseProductOption[]>;
  readonly onLoadBaseProduct: (id: string) => Promise<ProductDetails>;
  readonly onCreateBrand: (data: ReferenceWriteData) => Promise<ProductOption>;
  readonly onSubmit: (values: ProductFormValues) => Promise<void> | void;
}

const nutrientValueTypeOptions = [
  { value: "UNKNOWN", label: "Не визначено" },
  { value: "ANALYTICAL", label: "Лабораторне значення" },
  { value: "LABEL", label: "З етикетки" },
  { value: "ESTIMATED", label: "Оцінене" },
  { value: "CALCULATED", label: "Розраховане" },
  { value: "DERIVED", label: "Похідне" },
] as const;

export function ProductForm({
  mode,
  initialValues = EMPTY_PRODUCT_FORM,
  categories,
  measurementUnits,
  brands,
  genericProducts,
  nutrients,
  isSubmitting = false,
  onSearchGenericProducts,
  onLoadBaseProduct,
  onCreateBrand,
  onSubmit,
}: ProductFormProps) {
  const {
    register,
    control,
    reset,
    setValue,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: initialValues,
  });
  const nutrientFields = useFieldArray({ control, name: "nutrients" });
  const portionFields = useFieldArray({ control, name: "portions" });
  const productType = useWatch({ control, name: "type" });
  const labelNutrients = useWatch({ control, name: "nutrients" });
  const [basePreview, setBasePreview] = useState<ProductDetails | null>(null);
  const [baseStatus, setBaseStatus] = useState<"idle" | "loading" | "error">("idle");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const [brandError, setBrandError] = useState<string | null>(null);
  const [brandCreating, setBrandCreating] = useState(false);
  const [createdBrands, setCreatedBrands] = useState<readonly ProductOption[]>([]);
  const brandOptions = useMemo(
    () => [
      ...brands,
      ...createdBrands.filter((item) => !brands.some(({ value }) => value === item.value)),
    ],
    [brands, createdBrands],
  );
  const inheritedNutrients = useMemo(() => {
    const overridden = new Set((labelNutrients ?? []).map((item) => item.nutrientId));
    return basePreview?.nutrients.filter((item) => !overridden.has(item.nutrientId)) ?? [];
  }, [basePreview, labelNutrients]);

  useDirtyFormGuard(isDirty);
  useEffect(() => reset(initialValues), [initialValues, reset]);

  const closeScanner = useCallback(() => setScannerOpen(false), []);
  const acceptBarcode = useCallback(
    (value: string) => setValue("gtin", value, { shouldDirty: true, shouldValidate: true }),
    [setValue],
  );

  async function selectBaseProduct(id: string): Promise<void> {
    setValue("baseProductId", id, { shouldDirty: true, shouldValidate: true });
    if (id === "") {
      setBasePreview(null);
      setBaseStatus("idle");
      return;
    }
    setBaseStatus("loading");
    try {
      const base = await onLoadBaseProduct(id);
      setBasePreview(base);
      setValue("categoryId", base.categoryId, { shouldDirty: true, shouldValidate: true });
      setValue("defaultMeasurementUnitId", base.defaultMeasurementUnitId, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setBaseStatus("idle");
    } catch {
      setBasePreview(null);
      setBaseStatus("error");
    }
  }

  async function createBrand(data: ReferenceWriteData): Promise<void> {
    setBrandCreating(true);
    setBrandError(null);
    try {
      const brand = await onCreateBrand(data);
      setCreatedBrands((current) => [...current, brand]);
      setValue("brandId", brand.value, { shouldDirty: true, shouldValidate: true });
      setBrandOpen(false);
    } catch (error) {
      setBrandError(getUserFacingErrorMessage(error));
      throw error;
    } finally {
      setBrandCreating(false);
    }
  }

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values);
      reset(values);
    } catch {
      // The parent mutation renders a stable toast; prevent an unhandled form rejection.
    }
  });

  return (
    <>
      <form className="product-form" onSubmit={submit} noValidate>
        <fieldset className="product-form__section">
          <legend>Основні дані</legend>

          <div className="product-form__grid">
            <SelectField
              label="Тип продукту"
              options={Object.entries(PRODUCT_TYPE_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
              error={errors.type?.message}
              disabled={mode === "edit"}
              {...register("type")}
            />
            <TextInput
              label="Назва англійською"
              required
              error={errors.nameEn?.message}
              {...register("nameEn")}
            />
            <TextInput
              label="Назва українською"
              error={errors.nameUa?.message}
              {...register("nameUa")}
            />
            <SelectField
              label="Категорія"
              placeholder="Оберіть категорію"
              options={categories}
              required
              error={errors.categoryId?.message}
              {...register("categoryId")}
            />
            <SelectField
              label="Базова одиниця"
              placeholder="Оберіть одиницю"
              options={measurementUnits}
              required
              error={errors.defaultMeasurementUnitId?.message}
              {...register("defaultMeasurementUnitId")}
            />
            <SelectField
              label="Стан продукту"
              options={Object.entries(PRODUCT_FOOD_STATE_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
              error={errors.foodState?.message}
              {...register("foodState")}
            />
            <TextInput
              label="Їстівна частина, %"
              inputMode="decimal"
              description="Частка маси продукту, придатна до споживання."
              error={errors.ediblePortionPercent?.message}
              {...register("ediblePortionPercent")}
            />
          </div>

          {productType === "BRANDED" ? (
            <div className="product-form__conditional">
              <div className="product-form__grid">
                <div className="product-form__field-with-action">
                  <Controller
                    control={control}
                    name="brandId"
                    render={({ field }) => (
                      <SelectField
                        label="Бренд"
                        placeholder="Оберіть бренд"
                        options={brandOptions}
                        required
                        error={errors.brandId?.message}
                        {...field}
                      />
                    )}
                  />
                  <Button variant="secondary" onClick={() => setBrandOpen(true)}>
                    Створити новий бренд
                  </Button>
                </div>
                <div className="product-form__field-with-action">
                  <TextInput
                    label="GTIN"
                    inputMode="numeric"
                    description="Необов’язково: 8, 12, 13 або 14 цифр."
                    error={errors.gtin?.message}
                    {...register("gtin")}
                  />
                  <Button variant="secondary" onClick={() => setScannerOpen(true)}>
                    Сканувати штрихкод
                  </Button>
                </div>
                <Controller
                  control={control}
                  name="baseProductId"
                  render={({ field }) => (
                    <BaseProductSearch
                      value={field.value}
                      initialOptions={genericProducts}
                      disabled={mode === "edit"}
                      {...(errors.baseProductId?.message === undefined
                        ? {}
                        : { error: errors.baseProductId.message })}
                      onSearch={onSearchGenericProducts}
                      onChange={(value) => void selectBaseProduct(value)}
                    />
                  )}
                />
              </div>

              {baseStatus === "loading" ? <p role="status">Завантажуємо базовий продукт…</p> : null}
              {baseStatus === "error" ? (
                <p className="ui-field__error" role="alert">
                  Не вдалося завантажити базовий продукт. Спробуйте вибрати його ще раз.
                </p>
              ) : null}
              {basePreview === null ? null : (
                <section
                  className="product-form__inheritance-preview"
                  aria-labelledby="inherited-nutrients-title"
                >
                  <h3 id="inherited-nutrients-title">Успадковані нутрієнти</h3>
                  <p>
                    Значення базового продукту, яких немає серед введених даних етикетки, будуть
                    збережені як оцінені (ESTIMATED).
                  </p>
                  {inheritedNutrients.length === 0 ? (
                    <p>Усі нутрієнти базового продукту перевизначені даними етикетки.</p>
                  ) : (
                    <ul>
                      {inheritedNutrients.map((item) => (
                        <li key={item.nutrientId}>
                          {item.nutrientName}: {item.valuePer100g} {item.unit} / 100 г
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}
            </div>
          ) : null}

          <div className="ui-field">
            <label className="ui-field__label" htmlFor="product-notes">
              Нотатки
            </label>
            <textarea
              id="product-notes"
              className="ui-control product-form__textarea"
              {...register("notes")}
            />
            {errors.notes?.message === undefined ? null : (
              <p className="ui-field__error" role="alert">
                {errors.notes.message}
              </p>
            )}
          </div>
        </fieldset>

        <fieldset className="product-form__section">
          <legend>Поживність на 100 г</legend>
          <p className="product-form__hint">
            Порожній список під час редагування свідомо очищає nutrients.
          </p>

          <div className="product-form__rows">
            {nutrientFields.fields.map((field, index) => (
              <div className="product-form__repeat-row" key={field.id}>
                <SelectField
                  label={`Нутрієнт ${index + 1}`}
                  placeholder="Оберіть нутрієнт"
                  options={nutrients}
                  error={errors.nutrients?.[index]?.nutrientId?.message}
                  {...register(`nutrients.${index}.nutrientId`)}
                />
                <TextInput
                  label={nutrientValueLabel(labelNutrients?.[index]?.nutrientId, nutrients)}
                  inputMode="decimal"
                  error={errors.nutrients?.[index]?.valuePer100g?.message}
                  {...register(`nutrients.${index}.valuePer100g`)}
                />
                <SelectField
                  label="Джерело значення"
                  options={nutrientValueTypeOptions}
                  {...register(`nutrients.${index}.valueType`)}
                />
                <Button variant="ghost" onClick={() => nutrientFields.remove(index)}>
                  Видалити нутрієнт
                </Button>
              </div>
            ))}
          </div>
          <Button
            variant="secondary"
            onClick={() =>
              nutrientFields.append({
                nutrientId: "",
                valuePer100g: "",
                valueType: productType === "BRANDED" ? "LABEL" : "UNKNOWN",
              })
            }
          >
            Додати нутрієнт
          </Button>
        </fieldset>

        <fieldset className="product-form__section">
          <legend>Порції та вагові коефіцієнти</legend>
          <p className="product-form__hint">
            Порція задає кількість і відповідну вагу в грамах; cooking yield зберігається не в
            product, а в cooking session.
          </p>

          <div className="product-form__rows">
            {portionFields.fields.map((field, index) => (
              <div className="product-form__repeat-row" key={field.id}>
                <TextInput label="Назва англійською" {...register(`portions.${index}.labelEn`)} />
                <TextInput label="Назва українською" {...register(`portions.${index}.labelUa`)} />
                <TextInput
                  label="Кількість"
                  inputMode="decimal"
                  {...register(`portions.${index}.amount`)}
                />
                <TextInput
                  label="Вага, г"
                  inputMode="decimal"
                  {...register(`portions.${index}.gramWeight`)}
                />
                <SelectField
                  label="Одиниця"
                  placeholder="Без одиниці"
                  options={measurementUnits}
                  {...register(`portions.${index}.measurementUnitId`)}
                />
                <label className="product-form__checkbox">
                  <input type="checkbox" {...register(`portions.${index}.isDefault`)} />
                  Основна порція
                </label>
                <Button variant="ghost" onClick={() => portionFields.remove(index)}>
                  Видалити порцію
                </Button>
              </div>
            ))}
          </div>
          <Button
            variant="secondary"
            onClick={() =>
              portionFields.append({
                amount: "1",
                gramWeight: "",
                labelEn: "",
                labelUa: "",
                kind: "SERVING",
                weightType: "MEASURED",
                measurementUnitId: "",
                isDefault: false,
              })
            }
          >
            Додати порцію
          </Button>
        </fieldset>

        <div className="product-form__actions">
          <Button type="submit" isLoading={isSubmitting} loadingLabel="Зберігаємо…">
            {mode === "create" ? "Створити продукт" : "Зберегти зміни"}
          </Button>
          {isDirty ? <span role="status">Є незбережені зміни</span> : null}
        </div>
      </form>

      {scannerOpen ? (
        <BarcodeScanner open onClose={closeScanner} onDetected={acceptBarcode} />
      ) : null}
      {brandOpen ? (
        <Modal open title="Новий бренд" onClose={() => setBrandOpen(false)}>
          <ReferenceForm
            config={REFERENCE_CONFIGS.brands}
            resource="brands"
            mode="create"
            isSubmitting={brandCreating}
            submitError={brandError ?? undefined}
            onSubmit={(data) => createBrand(data)}
            onCancel={() => setBrandOpen(false)}
          />
        </Modal>
      ) : null}
    </>
  );
}

function nutrientValueLabel(
  nutrientId: string | undefined,
  nutrients: readonly ProductOption[],
): string {
  const unit = nutrients.find((nutrient) => nutrient.value === nutrientId)?.unit;
  return unit === undefined ? "Значення" : `Значення, ${unit}`;
}
