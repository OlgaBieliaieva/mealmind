import { fireEvent, render, screen } from "@testing-library/react";

import { describe, expect, it, vi } from "vitest";

import { FamilySettingsForm } from "./family-settings-form";

const family = {
  id: "family-id",
  name: "Моя сім’я",
  timeZone: "Europe/Kyiv",
  weekStartsOn: "MONDAY",
  role: "OWNER",
} as const;

describe("FamilySettingsForm", () => {
  it("starts with current family settings and keeps submit disabled while unchanged", () => {
    render(<FamilySettingsForm family={family} isPending={false} onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/^Назва сім’ї/)).toHaveValue("Моя сім’я");

    expect(screen.getByLabelText("Початок тижня")).toHaveValue("MONDAY");

    expect(screen.getByLabelText("Часовий пояс")).toHaveValue("Europe/Kyiv");

    expect(
      screen.getByRole("button", {
        name: "Зберегти зміни",
      }),
    ).toBeDisabled();
  });

  it("submits all family settings after a change", () => {
    const onSubmit = vi.fn();

    render(<FamilySettingsForm family={family} isPending={false} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Початок тижня"), {
      target: {
        value: "SUNDAY",
      },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Зберегти зміни",
      }),
    );

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Моя сім’я",
      timeZone: "Europe/Kyiv",
      weekStartsOn: "SUNDAY",
    });
  });
});
