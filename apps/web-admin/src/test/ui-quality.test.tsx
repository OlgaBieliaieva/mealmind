import { render } from "@testing-library/react";
import { describe, it, vi } from "vitest";

import { AdminShell } from "@/features/admin-shell/admin-shell";
import { Button, Card, Modal, PageState, SelectField, TextInput } from "@/shared/ui";

import { validateRenderedUi } from "./ui-quality";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("Web Admin markup and accessibility baseline", () => {
  it("validates the application shell and navigation", async () => {
    const { container } = render(
      <AdminShell>
        <section aria-labelledby="admin-page-title">
          <h1 id="admin-page-title">Панель керування</h1>
          <p>Керування каталогом і рецептами MealMind.</p>
        </section>
      </AdminShell>,
    );

    await validateRenderedUi(container);
  });

  it("validates shared form controls", async () => {
    const { container } = render(
      <main>
        <h1>Редагування довідника</h1>

        <Card>
          <form aria-labelledby="admin-form-title">
            <h2 id="admin-form-title">Основні дані</h2>

            <TextInput
              id="admin-name"
              label="Назва"
              description="Введіть зрозумілу назву."
              required
            />

            <SelectField
              id="admin-status"
              label="Статус"
              defaultValue=""
              placeholder="Оберіть статус"
              options={[
                {
                  value: "active",
                  label: "Активний",
                },
                {
                  value: "archived",
                  label: "Архівний",
                },
              ]}
              required
            />

            <Button type="submit">Зберегти</Button>
          </form>
        </Card>
      </main>,
    );

    await validateRenderedUi(container);
  });

  it("validates modal and page-state semantics", async () => {
    const { container } = render(
      <main>
        <h1>Перевірка станів інтерфейсу</h1>

        <Modal
          open
          title="Підтвердження"
          description="Перевірте зміни перед збереженням."
          footer={<Button>Підтвердити</Button>}
          onClose={vi.fn()}
        >
          <p>Зміни буде застосовано до довідника.</p>
        </Modal>

        <PageState
          kind="error"
          title="Не вдалося завантажити дані"
          description="Спробуйте повторити запит."
          headingLevel={2}
          actions={<Button variant="secondary">Повторити</Button>}
        />
      </main>,
    );

    await validateRenderedUi(container);
  });
});
