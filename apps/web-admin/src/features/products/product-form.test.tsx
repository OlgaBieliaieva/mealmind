import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { validateRenderedUi } from "@/test/ui-quality";

import { ProductForm } from "./product-form";

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
} as const;

describe("ProductForm", () => {
  it("reveals labelled branded fields and keeps valid accessible markup", async () => {
    const { container } = render(<ProductForm mode="create" {...options} onSubmit={vi.fn()} />);

    fireEvent.change(screen.getByRole("combobox", { name: "Тип продукту" }), {
      target: { value: "BRANDED" },
    });

    expect(screen.getByRole("combobox", { name: "Бренд" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "GTIN" })).toBeRequired();
    expect(screen.getByRole("combobox", { name: "Базовий generic product" })).toBeRequired();
    await validateRenderedUi(container);
  });

  it("announces validation errors and does not submit an incomplete form", async () => {
    const onSubmit = vi.fn();
    render(<ProductForm mode="create" {...options} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "Створити продукт" }));

    await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
