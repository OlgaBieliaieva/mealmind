import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getMealPlanWeek } from "@/shared/api/meal-plans";
import { validateRenderedUi } from "@/test/ui-quality";
import { MealPlanScreen } from "./meal-plan-screen";

const replace = vi.fn();
let search = "date=2026-08-21";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(search),
}));

vi.mock("@/shared/api/browser-api-client", () => ({ getBrowserApiClient: () => ({}) }));
vi.mock("@/shared/api/meal-plans", () => ({ getMealPlanWeek: vi.fn() }));

function renderPlan() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MealPlanScreen />
    </QueryClientProvider>,
  );
}

describe("MealPlanScreen", () => {
  beforeEach(() => {
    replace.mockReset();
    search = "date=2026-08-21";
    vi.mocked(getMealPlanWeek).mockResolvedValue({
      data: {
        planId: null,
        familyName: "Родина Тестових",
        weekStart: "2026-08-17",
        weekEnd: "2026-08-23",
        weekStartsOn: "MONDAY",
        timeZone: "Europe/Kyiv",
        days: ["17", "18", "19", "20", "21", "22", "23"].map((day) => ({
          date: `2026-08-${day}`,
          meals: [
            {
              mealType: { id: "breakfast", code: "breakfast", name: "Сніданок", sortOrder: 1 },
              entries: [],
            },
          ],
        })),
        members: [],
      },
    });
  });

  it("renders the canonical empty week with accessible controls", async () => {
    const { container } = renderPlan();
    expect(await screen.findByRole("heading", { name: "План харчування" })).toBeInTheDocument();
    expect(screen.getByText("Родина Тестових")).toBeInTheDocument();
    expect(screen.getByText("План ще не створено")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Сніданок" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Перейти до пошуку їжі/ })).toHaveAttribute(
      "href",
      expect.stringContaining("/plan/discover"),
    );
    await validateRenderedUi(container);
  });

  it("opens a localized day picker from the calendar button", async () => {
    renderPlan();
    const button = await screen.findByRole("button", { name: "Обрати дату в календарі" });
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(document.querySelector("#plan-day-picker")).toBeInTheDocument();
  });

  it("does not select the whole week when multi-day mode is enabled", async () => {
    search = "date=2026-08-21&multi=true";
    renderPlan();
    const days = await screen.findByRole("group", { name: "Дні тижня" });
    expect(days.querySelectorAll('[aria-pressed="true"]')).toHaveLength(0);
    expect(screen.getByText("Оберіть дні тижня")).toBeInTheDocument();
  });

  it("stores the member view in the URL instead of mutating plan data", async () => {
    renderPlan();
    const button = await screen.findByRole("button", { name: /За людьми/ });
    button.click();
    expect(replace).toHaveBeenCalledWith("/plan?date=2026-08-21&view=member", { scroll: false });
  });

  it("keeps member cards in an empty plan and provides a member-scoped search link", async () => {
    search = "date=2026-08-21&view=member";
    vi.mocked(getMealPlanWeek).mockResolvedValue({
      data: {
        planId: null,
        familyName: "Родина Тестових",
        weekStart: "2026-08-17",
        weekEnd: "2026-08-23",
        weekStartsOn: "MONDAY",
        timeZone: "Europe/Kyiv",
        days: ["17", "18", "19", "20", "21", "22", "23"].map((day) => ({
          date: `2026-08-${day}`,
          meals: [],
        })),
        members: [
          {
            memberId: "member-1",
            name: "Олена",
            avatarUrl: null,
            consumed: [],
            targets: [],
            completeness: "unavailable",
          },
        ],
      },
    });

    renderPlan();
    expect(await screen.findByRole("heading", { name: "Олена" })).toBeInTheDocument();
    expect(screen.queryByText("План ще не створено")).not.toBeInTheDocument();
    expect(screen.getByText("Для цього учасника план ще не створено.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Перейти до пошуку їжі/ })).toHaveAttribute(
      "href",
      expect.stringContaining("memberId=member-1"),
    );
  });
});
