"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import { Button, SelectField, TextInput } from "@/shared/ui";

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
  onSubmit,
}: ProductFormProps) {
  const {
    register,
    control,
    reset,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: initialValues,
  });
  const nutrientFields = useFieldArray({ control, name: "nutrients" });
  const portionFields = useFieldArray({ control, name: "portions" });
  const productType = useWatch({ control, name: "type" });

  useDirtyFormGuard(isDirty);
  useEffect(() => reset(initialValues), [initialValues, reset]);

  const submit = handleSubmit(async (values) => {
    await onSubmit(values);
    reset(values);
  });

  return (
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
          <div className="product-form__grid product-form__conditional">
            <SelectField
              label="Бренд"
              placeholder="Оберіть бренд"
              options={brands}
              required
              error={errors.brandId?.message}
              {...register("brandId")}
            />
            <TextInput label="GTIN" required error={errors.gtin?.message} {...register("gtin")} />
            <SelectField
              label="Базовий generic product"
              placeholder="Оберіть базовий продукт"
              options={genericProducts}
              required
              disabled={mode === "edit"}
              description="Пропущені relations копіюються як snapshot під час створення."
              error={errors.baseProductId?.message}
              {...register("baseProductId")}
            />
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
                label="Значення"
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
            nutrientFields.append({ nutrientId: "", valuePer100g: "", valueType: "UNKNOWN" })
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
  );
}
