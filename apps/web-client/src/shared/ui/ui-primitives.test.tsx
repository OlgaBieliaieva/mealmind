import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { Button, Card, Modal, PageState, SelectField, TextInput } from "./index";

beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function showModal(this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });

  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function close(this: HTMLDialogElement) {
      this.removeAttribute("open");
    },
  });
});

describe("UI primitives", () => {
  it("renders a non-submitting button by default", () => {
    const onClick = vi.fn();

    render(<Button onClick={onClick}>Зберегти</Button>);

    const button = screen.getByRole("button", {
      name: "Зберегти",
    });

    expect(button).toHaveAttribute("type", "button");

    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("disables a loading button and exposes its state", () => {
    render(
      <Button isLoading loadingLabel="Збереження…">
        Зберегти
      </Button>,
    );

    const button = screen.getByRole("button", {
      name: "Збереження…",
    });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("renders reusable card content", () => {
    render(
      <Card>
        <p>Вміст картки</p>
      </Card>,
    );

    expect(screen.getByText("Вміст картки")).toBeInTheDocument();
  });

  it("connects text input labels, descriptions and errors", () => {
    render(
      <TextInput
        label="Назва"
        description="Введіть зрозумілу назву."
        error="Назва обов’язкова."
        required
      />,
    );

    const input = screen.getByRole("textbox", {
      name: "Назва",
    });

    expect(input).toBeRequired();
    expect(input).toHaveAttribute("aria-invalid", "true");

    expect(screen.getByText("Назва обов’язкова.")).toHaveAttribute("role", "alert");
  });

  it("renders a labelled select with stable options", () => {
    render(
      <SelectField
        label="Тип прийому їжі"
        defaultValue=""
        placeholder="Оберіть тип"
        options={[
          {
            value: "breakfast",
            label: "Сніданок",
          },
          {
            value: "dinner",
            label: "Вечеря",
          },
        ]}
      />,
    );

    const select = screen.getByRole("combobox", {
      name: "Тип прийому їжі",
    });

    fireEvent.change(select, {
      target: {
        value: "dinner",
      },
    });

    expect(select).toHaveValue("dinner");
  });

  it("opens a modal and delegates closing", () => {
    const onClose = vi.fn();

    render(
      <Modal
        open
        title="Підтвердження"
        description="Перевірте дію перед продовженням."
        onClose={onClose}
      >
        <p>Вміст діалогового вікна</p>
      </Modal>,
    );

    expect(
      screen.getByRole("dialog", {
        name: "Підтвердження",
      }),
    ).toHaveAttribute("open");

    fireEvent.click(
      screen.getByRole("button", {
        name: "Закрити діалогове вікно",
      }),
    );

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders an announced error state", () => {
    render(
      <PageState
        kind="error"
        title="Не вдалося завантажити дані"
        description="Спробуйте ще раз."
      />,
    );

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Не вдалося завантажити дані",
      }),
    ).toBeInTheDocument();

    expect(screen.getByText("Спробуйте ще раз.")).toBeInTheDocument();
  });
});
