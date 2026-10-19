import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProductVerificationChecklist } from "./product-verification-checklist";

describe("ProductVerificationChecklist", () => {
  it("explains blocking requirements separately from recommendations", () => {
    render(
      <ProductVerificationChecklist
        readiness={{
          status: "BLOCKED",
          blockingIssues: ["UNSPECIFIED_FOOD_STATE", "MISSING_ENERGY"],
          warnings: ["MISSING_PRIMARY_IMAGE"],
        }}
        verifiedAt={null}
      />,
    );

    expect(screen.getByRole("heading", { name: "Продукт потрібно доповнити" })).toBeVisible();
    expect(screen.getByText("Оберіть загальний стан продукту")).toBeVisible();
    expect(screen.getByText("Додайте енергетичну цінність")).toBeVisible();
    expect(screen.getByText("Рекомендовано додати основне фото")).toBeVisible();
  });

  it("shows that warnings do not block verification", () => {
    render(
      <ProductVerificationChecklist
        readiness={{
          status: "READY",
          blockingIssues: [],
          warnings: ["MISSING_DEFAULT_PORTION"],
        }}
        verifiedAt="2026-10-19T10:00:00.000Z"
      />,
    );

    expect(screen.getByRole("heading", { name: "Обов’язкові дані заповнено" })).toBeVisible();
    expect(screen.getByText(/Рекомендації не блокують/)).toBeVisible();
    expect(screen.getByText("Рекомендовано визначити типову порцію")).toBeVisible();
  });
});
