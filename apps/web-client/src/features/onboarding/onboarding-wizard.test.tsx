import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { validateRenderedUi } from "@/test/ui-quality";
import { OnboardingWizard } from "./onboarding-wizard";

const mocks = vi.hoisted(() => ({
  complete: vi.fn(),
  readProfile: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));
vi.mock("@/shared/api/family", () => ({
  completeOnboarding: mocks.complete,
  readOwnProfile: mocks.readProfile,
}));

describe("OnboardingWizard", () => {
  beforeEach(() => vi.clearAllMocks());
  it("completes onboarding without calculations when required inputs are missing", async () => {
    mocks.complete.mockResolvedValue(undefined);
    const { container } = render(<OnboardingWizard />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "1");
    expect(screen.getByText(/Ім’я використовується/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Продовжити" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Вкажіть ім’я");
    fireEvent.change(screen.getByLabelText(/Ім’я/), { target: { value: "Олена" } });
    fireEvent.click(screen.getByRole("button", { name: "Продовжити" }));
    for (let step = 2; step < 8; step += 1)
      fireEvent.click(screen.getByRole("button", { name: "Пропустити" }));
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "8");
    fireEvent.click(screen.getByRole("button", { name: "Завершити" }));
    await waitFor(() => expect(mocks.complete).toHaveBeenCalledWith({ firstName: "Олена" }));
    expect(await screen.findByText("Поки що недостатньо даних")).toBeInTheDocument();
    expect(screen.getByText(/доповнити інформацію в особистому профілі/i)).toBeInTheDocument();
    await validateRenderedUi(container);
    expect(mocks.replace).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Розпочати" }));
    expect(mocks.replace).toHaveBeenCalledWith("/");
  });

  it("shows calculation progress and the recommended energy and macronutrients", async () => {
    mocks.complete.mockResolvedValue(undefined);
    mocks.readProfile.mockResolvedValue({
      nutritionTargets: {
        current: {
          restingEnergyKcal: "1420.4",
          maintenanceEnergyKcal: "2414.68",
          targets: [
            {
              nutrient: { code: "protein" },
              minimumValue: "72",
              targetValue: null,
              maximumValue: "96",
            },
            {
              nutrient: { code: "carbohydrate" },
              minimumValue: "271.65",
              targetValue: null,
              maximumValue: "392.39",
            },
            {
              nutrient: { code: "total_fat" },
              minimumValue: "53.66",
              targetValue: null,
              maximumValue: "93.9",
            },
          ],
        },
      },
    });

    const { container } = render(<OnboardingWizard />);
    fireEvent.change(screen.getByLabelText(/Ім’я/), { target: { value: "Олена" } });
    fireEvent.click(screen.getByRole("button", { name: "Продовжити" }));
    fireEvent.click(screen.getByRole("button", { name: "Пропустити" }));
    fireEvent.change(screen.getByLabelText("Дата народження"), {
      target: { value: "1990-01-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Продовжити" }));
    fireEvent.change(screen.getByLabelText("Стать для розрахунків"), {
      target: { value: "FEMALE" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Продовжити" }));
    fireEvent.change(screen.getByLabelText("Зріст, см"), { target: { value: "168" } });
    fireEvent.click(screen.getByRole("button", { name: "Продовжити" }));
    fireEvent.change(screen.getByLabelText("Вага, кг"), { target: { value: "60" } });
    fireEvent.click(screen.getByRole("button", { name: "Продовжити" }));
    fireEvent.change(screen.getByLabelText("Рівень активності"), {
      target: { value: "MODERATE" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Продовжити" }));
    fireEvent.click(screen.getByRole("button", { name: "Завершити" }));

    expect(screen.getByText("Розраховуємо ваші базові норми")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Прогрес розрахунку" })).toHaveAttribute(
      "max",
      "100",
    );
    await validateRenderedUi(container);

    expect(
      await screen.findByText("Ваші рекомендовані базові норми", {}, { timeout: 4_000 }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 420 ккал/день")).toBeInTheDocument();
    expect(screen.getByText("2 415 ккал/день")).toBeInTheDocument();
    expect(screen.getByText("72–96 г/день")).toBeInTheDocument();
    expect(screen.getByText("272–392 г/день")).toBeInTheDocument();
    expect(screen.getByText("54–94 г/день")).toBeInTheDocument();
    expect(screen.getByText(/змінити ці норми або перерахувати їх/i)).toBeInTheDocument();
    await validateRenderedUi(container);
  }, 6_000);
});
