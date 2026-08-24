import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { validateRenderedUi } from "@/test/ui-quality";
import { RecipeForm } from "./recipe-form";

const productId = "00000000-0000-4000-8000-000000000001";
const props = {
  mode: "create" as const,
  products: [{ value: productId, label: "Яблуко" }],
  recipeTypes: [],
  authors: [],
  cuisines: [],
  dietaryTags: [],
  nutrients: [],
  preview: null,
  onSearchProducts: vi.fn(async () => []),
  onSubmit: vi.fn(),
  onPreview: vi.fn(),
};

describe("RecipeForm", () => {
  it("adds labelled ingredient and step groups with accessible announcements", async () => {
    const { container } = render(<RecipeForm {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Додати інгредієнт" }));
    fireEvent.click(screen.getByRole("button", { name: "Додати крок" }));
    expect(screen.getByText("Інгредієнт 2")).toBeInTheDocument();
    expect(screen.getByText("Крок 2")).toBeInTheDocument();
    expect(screen.getByText("Додано новий крок")).toBeInTheDocument();
    await validateRenderedUi(container);
  });

  it("shows field-level errors and blocks an incomplete recipe", async () => {
    const onSubmit = vi.fn();
    render(<RecipeForm {...props} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "Створити рецепт" }));
    await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("filters and selects multiple cuisines with checkboxes", async () => {
    const { container } = render(
      <RecipeForm
        {...props}
        cuisines={[
          { value: "ua", label: "Українська" },
          { value: "it", label: "Італійська" },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Кухні Нічого не вибрано/ }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Пошук за назвою" }), {
      target: { value: "укра" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "Українська" }));

    expect(screen.queryByRole("checkbox", { name: "Італійська" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Кухні Українська/ })).toBeInTheDocument();
    await validateRenderedUi(container);
  });

  it("searches products remotely and selects a result", async () => {
    const onSearchProducts = vi.fn(async () => [
      { value: productId, label: "Яблуко", description: "Фрукти" },
    ]);
    const { container } = render(
      <RecipeForm {...props} products={[]} onSearchProducts={onSearchProducts} />,
    );

    const input = screen.getByRole("combobox", { name: /Продукт/ });
    fireEvent.change(input, { target: { value: "яб" } });

    expect(await screen.findByRole("option", { name: /Яблуко/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("option", { name: /Яблуко/ }));

    expect(onSearchProducts).toHaveBeenCalledWith("яб");
    expect(input).toHaveValue("Яблуко");
    await validateRenderedUi(container);
  });

  it("renders a readable nutrition table with units and completeness guidance", async () => {
    const { container } = render(
      <RecipeForm
        {...props}
        nutrients={[
          { value: "energy", label: "Енергія", unit: "KCAL" },
          { value: "protein", label: "Білки", unit: "G" },
        ]}
        preview={{
          inputFingerprint: "fingerprint",
          totalIngredientWeightG: "790",
          nutrients: [
            { nutrientId: "protein", valueTotal: "37.7054", completeness: "PARTIAL" },
            { nutrientId: "energy", valueTotal: "897.476416", completeness: "COMPLETE" },
          ],
        }}
      />,
    );

    const nutritionTable = screen.getByRole("table", { name: "Поживність усього рецепта" });
    expect(nutritionTable).toBeInTheDocument();
    expect(screen.getByText(/897,5 ккал/)).toBeInTheDocument();
    expect(screen.getByText(/37,71 г/)).toBeInTheDocument();
    expect(within(nutritionTable).getByText("Повні")).toBeInTheDocument();
    expect(within(nutritionTable).getByText("Часткові")).toBeInTheDocument();
    expect(screen.getByText(/фактична кількість може бути більшою/)).toBeInTheDocument();
    await validateRenderedUi(container);
  });
});
