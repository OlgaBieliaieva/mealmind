import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ClientShell } from "./client-shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("ClientShell", () => {
  it("renders accessible application landmarks", () => {
    render(
      <ClientShell>
        <h1>Тестова сторінка</h1>
      </ClientShell>,
    );

    expect(screen.getByRole("banner")).toBeInTheDocument();

    expect(
      screen.getByRole("navigation", {
        name: "Основна навігація",
      }),
    ).toBeInTheDocument();

    expect(screen.getByRole("main")).toContainElement(
      screen.getByRole("heading", {
        level: 1,
        name: "Тестова сторінка",
      }),
    );

    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("marks the current navigation item", () => {
    render(
      <ClientShell>
        <h1>Головна</h1>
      </ClientShell>,
    );

    expect(
      screen.getByRole("link", {
        name: "Головна",
      }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("provides a skip link to the main content", () => {
    render(
      <ClientShell>
        <h1>Головна</h1>
      </ClientShell>,
    );

    expect(
      screen.getByRole("link", {
        name: "Перейти до основного вмісту",
      }),
    ).toHaveAttribute("href", "#main-content");

    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
  });
});
