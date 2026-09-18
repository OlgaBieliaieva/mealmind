import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { validateRenderedUi } from "@/test/ui-quality";

import { ProductForm } from "./product-form";
import { EMPTY_PRODUCT_FORM } from "./product-form-schema";

const categoryId = "24b79ffc-e6af-440c-ae38-8cd37c22be1c";
const unitId = "34b79ffc-e6af-440c-ae38-8cd37c22be1c";
const brandId = "44b79ffc-e6af-440c-ae38-8cd37c22be1c";
const baseProductId = "54b79ffc-e6af-440c-ae38-8cd37c22be1c";

const options = {
  categories: [{ value: categoryId, label: "Фрукти" }],
  measurementUnits: [{ value: unitId, label: "г" }],
  brands: [{ value: brandId, label: "MealMind Foods" }],
  genericProducts: [{ value: baseProductId, label: "Яблуко" }],
  nutrients: [],
  onSearchGenericProducts: vi.fn().mockResolvedValue([]),
  onLoadBaseProduct: vi.fn(),
  onCreateBrand: vi.fn(),
} as const;

describe("ProductForm", () => {
  it("reveals labelled branded fields and keeps valid accessible markup", async () => {
    const { container } = render(<ProductForm mode="create" {...options} onSubmit={vi.fn()} />);

    fireEvent.change(screen.getByRole("combobox", { name: "Тип продукту" }), {
      target: { value: "BRANDED" },
    });

    expect(screen.getByRole("combobox", { name: "Бренд" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "GTIN" })).not.toBeRequired();
    expect(screen.getByRole("combobox", { name: "Базовий generic-продукт" })).not.toBeRequired();
    expect(screen.getByRole("button", { name: "Сканувати штрихкод" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Створити новий бренд" })).toBeInTheDocument();
    await validateRenderedUi(container);
  });

  it("autofills classification from a selected base product", async () => {
    const onSearchGenericProducts = vi
      .fn()
      .mockResolvedValue([{ value: baseProductId, label: "Яблуко", description: "Фрукти" }]);
    const onLoadBaseProduct = vi.fn().mockResolvedValue({
      categoryId,
      defaultMeasurementUnitId: unitId,
      nutrients: [],
    });
    render(
      <ProductForm
        mode="create"
        {...options}
        onSearchGenericProducts={onSearchGenericProducts}
        onLoadBaseProduct={onLoadBaseProduct}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Тип продукту" }), {
      target: { value: "BRANDED" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Базовий generic-продукт" }), {
      target: { value: "Яб" },
    });

    await waitFor(() => expect(onSearchGenericProducts).toHaveBeenCalledWith("Яб"));
    fireEvent.click(await screen.findByRole("option", { name: /Яблуко/ }));

    await waitFor(() => expect(onLoadBaseProduct).toHaveBeenCalledWith(baseProductId));
    expect(screen.getByRole("combobox", { name: "Категорія" })).toHaveValue(categoryId);
    expect(screen.getByRole("combobox", { name: "Базова одиниця" })).toHaveValue(unitId);
  });

  it("creates a brand with the complete reference form and selects it", async () => {
    const createdBrandId = "64b79ffc-e6af-440c-ae38-8cd37c22be1c";
    const onCreateBrand = vi.fn().mockResolvedValue({ value: createdBrandId, label: "Nova Foods" });
    render(
      <ProductForm mode="create" {...options} onCreateBrand={onCreateBrand} onSubmit={vi.fn()} />,
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Тип продукту" }), {
      target: { value: "BRANDED" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Створити новий бренд" }));
    const brandDialog = within(screen.getByRole("dialog"));

    fireEvent.change(brandDialog.getByRole("textbox", { name: "Основна назва" }), {
      target: { value: "Nova Foods" },
    });
    fireEvent.change(brandDialog.getByRole("textbox", { name: "Назва українською" }), {
      target: { value: "Нова Фудс" },
    });
    fireEvent.change(brandDialog.getByRole("textbox", { name: "Назва англійською" }), {
      target: { value: "Nova Foods" },
    });
    fireEvent.change(brandDialog.getByRole("textbox", { name: "Код країни ISO 3166-1 alpha-2" }), {
      target: { value: "ua" },
    });
    fireEvent.change(brandDialog.getByRole("textbox", { name: "Вебсайт" }), {
      target: { value: "https://nova.example" },
    });
    fireEvent.change(brandDialog.getByRole("combobox", { name: "Статус" }), {
      target: { value: "ACTIVE" },
    });
    fireEvent.change(brandDialog.getByRole("combobox", { name: "Перевірка" }), {
      target: { value: "VERIFIED" },
    });
    fireEvent.click(brandDialog.getByRole("button", { name: "Створити" }));

    await waitFor(() =>
      expect(onCreateBrand).toHaveBeenCalledWith({
        name: "Nova Foods",
        nameUa: "Нова Фудс",
        nameEn: "Nova Foods",
        countryCode: "UA",
        websiteUrl: "https://nova.example",
        status: "ACTIVE",
        verificationStatus: "VERIFIED",
      }),
    );
    expect(screen.getByRole("combobox", { name: "Бренд" })).toHaveValue(createdBrandId);
  });

  it("shows the selected nutrient unit in the value label", () => {
    render(
      <ProductForm
        mode="create"
        {...options}
        nutrients={[{ value: "nutrient-id", label: "Кальцій", unit: "мг" }]}
        initialValues={{
          ...EMPTY_PRODUCT_FORM,
          nutrients: [{ nutrientId: "nutrient-id", valuePer100g: "10", valueType: "LABEL" }],
        }}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole("textbox", { name: "Значення, мг" })).toHaveValue("10");
  });

  it("announces validation errors and does not submit an incomplete form", async () => {
    const onSubmit = vi.fn();
    render(<ProductForm mode="create" {...options} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "Створити продукт" }));

    await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
