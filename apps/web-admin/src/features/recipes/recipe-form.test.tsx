import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
});
