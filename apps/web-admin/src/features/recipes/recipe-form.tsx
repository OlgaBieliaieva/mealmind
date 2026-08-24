"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";

import type { RecipeNutritionPreview } from "@/shared/api/recipes";
import { Button, SelectField, TextInput } from "@/shared/ui";

import { RECIPE_DIFFICULTY_LABELS } from "./recipe-labels";
import { EMPTY_RECIPE_FORM, recipeFormSchema, type RecipeFormValues } from "./recipe-form-schema";
import { ProductSearchCombobox } from "./product-search-combobox";
import { useDirtyFormGuard } from "../products/use-dirty-form-guard";
import { SearchableMultiSelect } from "./searchable-multi-select";

export interface RecipeOption {
  readonly value: string;
  readonly label: string;
}
export interface RecipeProductOption extends RecipeOption {
  readonly description?: string;
}
export interface RecipeNutrientOption extends RecipeOption {
  readonly unit: string;
}
export interface RecipeFormProps {
  readonly mode: "create" | "edit";
  readonly initialValues?: RecipeFormValues;
  readonly products: readonly RecipeProductOption[];
  readonly recipeTypes: readonly RecipeOption[];
  readonly authors: readonly RecipeOption[];
  readonly cuisines: readonly RecipeOption[];
  readonly dietaryTags: readonly RecipeOption[];
  readonly nutrients: readonly RecipeNutrientOption[];
  readonly preview: RecipeNutritionPreview | null;
  readonly isPreviewing?: boolean;
  readonly isSubmitting?: boolean;
  readonly onSearchProducts: (query: string) => Promise<readonly RecipeProductOption[]>;
  readonly onSubmit: (values: RecipeFormValues) => Promise<void> | void;
  readonly onPreview: (values: RecipeFormValues) => Promise<void> | void;
}

export function RecipeForm(props: RecipeFormProps) {
  const {
    register,
    control,
    reset,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<RecipeFormValues>({
    resolver: zodResolver(recipeFormSchema),
    defaultValues: props.initialValues ?? EMPTY_RECIPE_FORM,
  });
  const ingredients = useFieldArray({ control, name: "ingredients" });
  const steps = useFieldArray({ control, name: "steps" });
  const sources = useFieldArray({ control, name: "sources" });
  const videos = useFieldArray({ control, name: "videos" });
  const [announcement, setAnnouncement] = useState("");
  useDirtyFormGuard(isDirty);
  useEffect(() => reset(props.initialValues ?? EMPTY_RECIPE_FORM), [props.initialValues, reset]);

  const submit = handleSubmit(async (values) => {
    await props.onSubmit(values);
    reset(values);
  });
  const preview = handleSubmit((values) => props.onPreview(values));
  const announce = (message: string) => setAnnouncement(message);
  const previewRows = nutritionPreviewRows(props.preview, props.nutrients);

  return (
    <form className="recipe-form" onSubmit={submit} noValidate>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      <fieldset className="recipe-form__section">
        <legend>Основні дані</legend>
        <div className="recipe-form__grid">
          <TextInput
            label="Назва рецепта"
            required
            error={errors.title?.message}
            {...register("title")}
          />
          <SelectField
            label="Тип рецепта"
            placeholder="Без типу"
            options={props.recipeTypes}
            {...register("recipeTypeId")}
          />
          <SelectField
            label="Автор"
            placeholder="Без автора"
            options={props.authors}
            {...register("authorId")}
          />
          <SelectField
            label="Складність"
            options={[
              { value: "", label: "Не визначено" },
              ...Object.entries(RECIPE_DIFFICULTY_LABELS).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
            {...register("difficulty")}
          />
          <TextInput
            label="Кількість порцій"
            inputMode="numeric"
            required
            error={errors.baseServings?.message}
            {...register("baseServings")}
          />
          <TextInput
            label="Вихід готової страви, г"
            inputMode="decimal"
            error={errors.yieldWeightG?.message}
            {...register("yieldWeightG")}
          />
          <TextInput
            label="Підготовка, хв"
            inputMode="numeric"
            error={errors.prepTimeMin?.message}
            {...register("prepTimeMin")}
          />
          <TextInput
            label="Приготування, хв"
            inputMode="numeric"
            error={errors.cookTimeMin?.message}
            {...register("cookTimeMin")}
          />
          <TextInput
            label="Відпочинок, хв"
            inputMode="numeric"
            error={errors.restTimeMin?.message}
            {...register("restTimeMin")}
          />
        </div>
        <label className="ui-field">
          <span className="ui-field__label">Короткий опис</span>
          <textarea className="ui-control recipe-form__textarea" {...register("summary")} />
        </label>
        <label className="ui-field">
          <span className="ui-field__label">Повний опис</span>
          <textarea className="ui-control recipe-form__textarea" {...register("description")} />
        </label>
        <input type="hidden" value="PUBLIC" {...register("visibility")} />
      </fieldset>

      <fieldset className="recipe-form__section">
        <legend>Кухні та дієтичні позначки</legend>
        <div className="recipe-form__grid">
          <Controller
            control={control}
            name="cuisineIds"
            render={({ field }) => (
              <SearchableMultiSelect
                label="Кухні"
                options={props.cuisines}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="dietaryTagIds"
            render={({ field }) => (
              <SearchableMultiSelect
                label="Дієтичні позначки"
                options={props.dietaryTags}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>
      </fieldset>

      <fieldset className="recipe-form__section">
        <legend>Інгредієнти</legend>
        <p className="recipe-form__hint">
          Вага нормалізується в грами. Опційні інгредієнти не входять у базовий nutrition snapshot.
        </p>
        <div className="recipe-form__rows">
          {ingredients.fields.map((field, index) => (
            <fieldset className="recipe-form__repeat" key={field.id}>
              <legend>Інгредієнт {index + 1}</legend>
              <div className="recipe-form__grid">
                <Controller
                  control={control}
                  name={`ingredients.${index}.productId`}
                  render={({ field: productField }) => (
                    <ProductSearchCombobox
                      value={productField.value}
                      initialOptions={props.products}
                      error={errors.ingredients?.[index]?.productId?.message}
                      inputRef={productField.ref}
                      onBlur={productField.onBlur}
                      onChange={productField.onChange}
                      onSearch={props.onSearchProducts}
                    />
                  )}
                />
                <TextInput
                  label="Вага, г"
                  inputMode="decimal"
                  error={errors.ingredients?.[index]?.gramWeight?.message}
                  {...register(`ingredients.${index}.gramWeight`)}
                />
                <TextInput
                  label="Примітка"
                  error={errors.ingredients?.[index]?.note?.message}
                  {...register(`ingredients.${index}.note`)}
                />
                <label className="recipe-form__checkbox">
                  <input type="checkbox" {...register(`ingredients.${index}.isOptional`)} />
                  Опційний інгредієнт
                </label>
              </div>
              <Button
                variant="ghost"
                onClick={() => {
                  ingredients.remove(index);
                  announce(`Інгредієнт ${index + 1} видалено`);
                }}
              >
                Видалити інгредієнт
              </Button>
            </fieldset>
          ))}
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            ingredients.append({ productId: "", gramWeight: "", isOptional: false, note: "" });
            announce("Додано новий інгредієнт");
          }}
        >
          Додати інгредієнт
        </Button>
      </fieldset>

      <fieldset className="recipe-form__section">
        <legend>Кроки приготування</legend>
        <div className="recipe-form__rows">
          {steps.fields.map((field, index) => (
            <fieldset className="recipe-form__repeat" key={field.id}>
              <legend>Крок {index + 1}</legend>
              <label className="ui-field">
                <span className="ui-field__label">Інструкція</span>
                <textarea
                  className="ui-control recipe-form__textarea"
                  {...register(`steps.${index}.instruction`)}
                />
                {errors.steps?.[index]?.instruction?.message ? (
                  <span className="ui-field__error" role="alert">
                    {errors.steps[index]?.instruction?.message}
                  </span>
                ) : null}
              </label>
              <TextInput
                label="Таймер, хв"
                inputMode="numeric"
                error={errors.steps?.[index]?.timerMinutes?.message}
                {...register(`steps.${index}.timerMinutes`)}
              />
              <Button
                variant="ghost"
                onClick={() => {
                  steps.remove(index);
                  announce(`Крок ${index + 1} видалено`);
                }}
              >
                Видалити крок
              </Button>
            </fieldset>
          ))}
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            steps.append({ instruction: "", timerMinutes: "" });
            announce("Додано новий крок");
          }}
        >
          Додати крок
        </Button>
      </fieldset>

      <fieldset className="recipe-form__section">
        <legend>Джерела</legend>
        <div className="recipe-form__rows">
          {sources.fields.map((field, index) => (
            <div className="recipe-form__repeat recipe-form__grid" key={field.id}>
              <SelectField
                label={`Тип джерела ${index + 1}`}
                options={[
                  { value: "WEB_PAGE", label: "Вебсторінка" },
                  { value: "SOCIAL_POST", label: "Соціальна мережа" },
                  { value: "VIDEO", label: "Відео" },
                  { value: "OTHER", label: "Інше" },
                ]}
                {...register(`sources.${index}.kind`)}
              />
              <TextInput label="Назва" {...register(`sources.${index}.title`)} />
              <TextInput
                label="URL"
                error={errors.sources?.[index]?.url?.message}
                {...register(`sources.${index}.url`)}
              />
              <Button variant="ghost" onClick={() => sources.remove(index)}>
                Видалити джерело
              </Button>
            </div>
          ))}
        </div>
        <Button
          variant="secondary"
          onClick={() => sources.append({ kind: "WEB_PAGE", title: "", url: "" })}
        >
          Додати джерело
        </Button>
      </fieldset>

      <fieldset className="recipe-form__section">
        <legend>Відео</legend>
        <div className="recipe-form__rows">
          {videos.fields.map((field, index) => (
            <div className="recipe-form__repeat recipe-form__grid" key={field.id}>
              <SelectField
                label={`Платформа відео ${index + 1}`}
                options={["YOUTUBE", "INSTAGRAM", "TIKTOK", "OTHER"].map((value) => ({
                  value,
                  label: value,
                }))}
                {...register(`videos.${index}.platform`)}
              />
              <TextInput label="Назва" {...register(`videos.${index}.title`)} />
              <TextInput
                label="URL"
                error={errors.videos?.[index]?.externalUrl?.message}
                {...register(`videos.${index}.externalUrl`)}
              />
              <TextInput
                label="Тривалість, хв"
                inputMode="numeric"
                {...register(`videos.${index}.durationMinutes`)}
              />
              <Button variant="ghost" onClick={() => videos.remove(index)}>
                Видалити відео
              </Button>
            </div>
          ))}
        </div>
        <Button
          variant="secondary"
          onClick={() =>
            videos.append({ platform: "YOUTUBE", title: "", externalUrl: "", durationMinutes: "" })
          }
        >
          Додати відео
        </Button>
      </fieldset>

      <section className="recipe-form__section" aria-labelledby="nutrition-preview-title">
        <div className="recipe-nutrition__header">
          <div>
            <h2 id="nutrition-preview-title">Попередній розрахунок поживності</h2>
            <p className="recipe-form__hint">
              Орієнтовна кількість нутрієнтів у всьому рецепті до приготування.
            </p>
          </div>
          <Button
            variant="secondary"
            isLoading={props.isPreviewing ?? false}
            loadingLabel="Розраховуємо…"
            onClick={() => void preview()}
          >
            Розрахувати
          </Button>
        </div>
        {props.preview === null ? (
          <p className="recipe-form__hint">Додайте валідні інгредієнти й запустіть розрахунок.</p>
        ) : (
          <div className="recipe-nutrition" aria-live="polite">
            <div className="recipe-nutrition__weight">
              <span>Загальна вага обов’язкових інгредієнтів</span>
              <strong>{formatNutritionValue(props.preview.totalIngredientWeightG)} г</strong>
            </div>

            <div className="recipe-nutrition__explanation">
              <strong>Що означає повнота даних?</strong>
              <p>
                <b>Повні</b> — значення нутрієнта відоме для всіх обов’язкових інгредієнтів.
                <b> Часткові</b> — щонайменше для одного інгредієнта значення відсутнє, тому
                показана лише відома частина, а фактична кількість може бути більшою.
              </p>
            </div>

            {previewRows.length === 0 ? (
              <p className="recipe-form__hint">Для вибраних інгредієнтів немає даних поживності.</p>
            ) : (
              <div className="recipe-nutrition__table-scroll">
                <table className="recipe-nutrition__table">
                  <caption className="sr-only">Поживність усього рецепта</caption>
                  <thead>
                    <tr>
                      <th scope="col">Нутрієнт</th>
                      <th scope="col">Усього в рецепті</th>
                      <th scope="col">Повнота</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((item) => (
                      <tr key={item.nutrientId}>
                        <th scope="row">{item.label}</th>
                        <td className="recipe-nutrition__value">
                          {formatNutritionValue(item.valueTotal)} {item.unit}
                        </td>
                        <td>
                          <span
                            className={`recipe-nutrition__status recipe-nutrition__status--${item.completeness.toLocaleLowerCase()}`}
                          >
                            {item.completeness === "COMPLETE" ? "Повні" : "Часткові"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      <div className="recipe-form__actions">
        <Button type="submit" isLoading={props.isSubmitting ?? false} loadingLabel="Зберігаємо…">
          {props.mode === "create" ? "Створити рецепт" : "Зберегти зміни"}
        </Button>
        {isDirty ? <span role="status">Є незбережені зміни</span> : null}
      </div>
    </form>
  );
}

const NUTRIENT_UNIT_LABELS: Readonly<Record<string, string>> = {
  KCAL: "ккал",
  G: "г",
  MG: "мг",
  MCG: "мкг",
};

function nutritionPreviewRows(
  preview: RecipeNutritionPreview | null,
  nutrients: readonly RecipeNutrientOption[],
) {
  if (preview === null) return [];
  const optionById = new Map(nutrients.map((item, index) => [item.value, { ...item, index }]));
  return preview.nutrients
    .map((item) => {
      const option = optionById.get(item.nutrientId);
      return {
        ...item,
        label: option?.label ?? item.nutrientId,
        unit: NUTRIENT_UNIT_LABELS[option?.unit ?? ""] ?? option?.unit ?? "",
        sortOrder: option?.index ?? Number.MAX_SAFE_INTEGER,
      };
    })
    .sort(
      (left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label),
    );
}

function formatNutritionValue(value: string): string {
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  const absolute = Math.abs(number);
  const maximumFractionDigits = absolute >= 100 ? 1 : absolute >= 10 ? 2 : absolute >= 1 ? 3 : 4;
  return new Intl.NumberFormat("uk-UA", { maximumFractionDigits }).format(number);
}
