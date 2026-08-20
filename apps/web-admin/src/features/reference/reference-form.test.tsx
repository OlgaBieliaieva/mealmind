import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { validateRenderedUi } from "@/test/ui-quality";

import { REFERENCE_CONFIGS } from "./reference-config";
import { ReferenceForm } from "./reference-form";

describe("reference form", () => {
  it("renders accessible fields and reports validation errors", async () => {
    const submit = vi.fn();
    const { container } = render(
      <main>
        <h1>Створення алергену</h1>
        <ReferenceForm
          config={REFERENCE_CONFIGS.allergens}
          mode="create"
          onSubmit={submit}
          onCancel={vi.fn()}
        />
      </main>,
    );

    await validateRenderedUi(container);
    fireEvent.click(screen.getByRole("button", { name: "Створити" }));

    expect(await screen.findAllByRole("alert")).toHaveLength(3);
    expect(submit).not.toHaveBeenCalled();
  });

  it("submits normalized values", async () => {
    const submit = vi.fn(async () => undefined);
    render(
      <ReferenceForm
        config={REFERENCE_CONFIGS.allergens}
        mode="create"
        onSubmit={submit}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Стабільний код/), {
      target: { value: "tree_nuts" },
    });
    fireEvent.change(screen.getByLabelText(/Назва українською/), {
      target: { value: "Горіхи" },
    });
    fireEvent.change(screen.getByLabelText(/Назва англійською/), {
      target: { value: "Tree nuts" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Створити" }));

    expect(submit).toHaveBeenCalledWith({
      code: "tree_nuts",
      nameUa: "Горіхи",
      nameEn: "Tree nuts",
      isActive: true,
    });
  });
});
