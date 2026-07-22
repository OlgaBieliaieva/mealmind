import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("Web Client home page", () => {
  it("renders the application heading", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "MealMind Web Client",
      }),
    ).toBeInTheDocument();
  });
});
