import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OnboardingWizard } from "./onboarding-wizard";

const mocks = vi.hoisted(() => ({ complete: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));
vi.mock("@/shared/api/family", () => ({ completeOnboarding: mocks.complete }));

describe("OnboardingWizard", () => {
  beforeEach(() => vi.clearAllMocks());
  it("collects one answer per step and submits atomically at the end", async () => {
    mocks.complete.mockResolvedValue(undefined);
    render(<OnboardingWizard />);
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
    expect(mocks.replace).toHaveBeenCalledWith("/");
  });
});
