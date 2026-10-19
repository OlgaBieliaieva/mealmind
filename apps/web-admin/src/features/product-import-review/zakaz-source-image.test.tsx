import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ZakazSourceImage } from "./zakaz-source-image";

describe("ZakazSourceImage", () => {
  it("renders a validated Zakaz CDN image", () => {
    render(
      <ZakazSourceImage sourceUrl="https://img2.zakaz.ua/products/sample image.jpg" alt="Товар" />,
    );

    expect(screen.getByRole("img", { name: "Товар" })).toHaveAttribute(
      "src",
      "https://img2.zakaz.ua/products/sample%20image.jpg",
    );
  });

  it("renders the fallback without creating an image request for an unsafe URL", () => {
    render(
      <ZakazSourceImage
        sourceUrl={'javascript:<img src=x onerror="alert(1)">'}
        alt="Товар"
        fallback={<span>Зображення недоступне</span>}
      />,
    );

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("Зображення недоступне")).toBeInTheDocument();
  });
});
