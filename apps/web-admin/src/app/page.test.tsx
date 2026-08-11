import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("Web Admin home page", () => {
  it("renders the dashboard heading", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Огляд MealMind Admin",
      }),
    ).toBeInTheDocument();
  });

  it("links the available administration modules", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Доступні модулі",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "Довідники",
      }),
    ).toBeInTheDocument();

    expect(screen.getAllByRole("link", { name: "Відкрити модуль" })).toHaveLength(3);

    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "Продукти",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "Рецепти",
      }),
    ).toBeInTheDocument();
  });
});
