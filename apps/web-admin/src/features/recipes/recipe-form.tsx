"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import type { RecipeNutritionPreview } from "@/shared/api/recipes";
import { Button, SelectField, TextInput } from "@/shared/ui";

import { RECIPE_DIFFICULTY_LABELS } from "./recipe-labels";
import { EMPTY_RECIPE_FORM, recipeFormSchema, type RecipeFormValues } from "./recipe-form-schema";
import { useDirtyFormGuard } from "../products/use-dirty-form-guard";

export interface RecipeOption {
  readonly value: string;
  readonly label: string;
}
export interface RecipeFormProps {
  readonly mode: "create" | "edit";
  readonly initialValues?: RecipeFormValues;
  readonly products: readonly RecipeOption[];
  readonly recipeTypes: readonly RecipeOption[];
  readonly authors: readonly RecipeOption[];
  readonly cuisines: readonly RecipeOption[];
  readonly dietaryTags: readonly RecipeOption[];
  readonly nutrients: readonly RecipeOption[];
  readonly preview: RecipeNutritionPreview | null;
  readonly isPreviewing?: boolean;
  readonly isSubmitting?: boolean;
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
          <label className="ui-field">
            <span className="ui-field__label">Кухні</span>
            <select className="ui-control recipe-form__multi" multiple {...register("cuisineIds")}>
              {props.cuisines.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <span className="ui-field__description">
              Для вибору кількох значень використовуйте Ctrl або Command.
            </span>
          </label>
          <label className="ui-field">
            <span className="ui-field__label">Дієтичні позначки</span>
            <select
              className="ui-control recipe-form__multi"
              multiple
              {...register("dietaryTagIds")}
            >
              {props.dietaryTags.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
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
                <SelectField
                  label="Продукт"
                  placeholder="Оберіть продукт"
                  options={props.products}
                  error={errors.ingredients?.[index]?.productId?.message}
                  {...register(`ingredients.${index}.productId`)}
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
        <h2 id="nutrition-preview-title">Попередній розрахунок поживності</h2>
        <Button
          variant="secondary"
          isLoading={props.isPreviewing ?? false}
          loadingLabel="Розраховуємо…"
          onClick={() => void preview()}
        >
          Розрахувати
        </Button>
        {props.preview === null ? (
          <p className="recipe-form__hint">Додайте валідні інгредієнти й запустіть розрахунок.</p>
        ) : (
          <div aria-live="polite">
            <p>Загальна вага обов’язкових інгредієнтів: {props.preview.totalIngredientWeightG} г</p>
            <ul>
              {props.preview.nutrients.map((item) => (
                <li key={item.nutrientId}>
                  {props.nutrients.find((option) => option.value === item.nutrientId)?.label ??
                    item.nutrientId}
                  : {item.valueTotal} (
                  {item.completeness === "COMPLETE" ? "повні дані" : "часткові дані"})
                </li>
              ))}
            </ul>
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
