import { render } from "@testing-library/react";
import { describe, it, vi } from "vitest";

import { ClientShell } from "@/features/client-shell/client-shell";
import { AuthForm } from "@/features/auth/auth-form";
import { OnboardingWizard } from "@/features/onboarding/onboarding-wizard";
import { Button, Card, Modal, PageState, SelectField, TextInput } from "@/shared/ui";

import { validateRenderedUi } from "./ui-quality";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

describe("Web Client markup and accessibility baseline", () => {
  it("validates the application shell and navigation", async () => {
    const { container } = render(
      <ClientShell>
        <section aria-labelledby="client-page-title">
          <h1 id="client-page-title">Сімейне планування харчування</h1>
          <p>Створюйте плани харчування з урахуванням потреб родини.</p>
        </section>
      </ClientShell>,
    );

    await validateRenderedUi(container);
  });

  it("validates shared form controls", async () => {
    const { container } = render(
      <main>
        <h1>Налаштування плану</h1>

        <Card>
          <form aria-labelledby="client-form-title">
            <h2 id="client-form-title">Основні параметри</h2>

            <TextInput
              id="client-plan-name"
              label="Назва плану"
              description="Назва допоможе знайти план пізніше."
              required
            />

            <SelectField
              id="client-meal-type"
              label="Прийом їжі"
              defaultValue=""
              placeholder="Оберіть прийом їжі"
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
              required
            />

            <Button type="submit">Продовжити</Button>
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
          description="Перевірте вибрані параметри."
          footer={<Button>Підтвердити</Button>}
          onClose={vi.fn()}
        >
          <p>Після підтвердження план буде збережено.</p>
        </Modal>

        <PageState
          kind="empty"
          title="Планів ще немає"
          description="Створіть перший сімейний план харчування."
          headingLevel={2}
          actions={<Button>Створити план</Button>}
        />
      </main>,
    );

    await validateRenderedUi(container);
  });

  it("validates authentication and recovery form semantics", async () => {
    const { container } = render(
      <main>
        <AuthForm mode="sign-up" />
      </main>,
    );

    await validateRenderedUi(container);
  });

  it("validates onboarding progress and form semantics", async () => {
    const { container } = render(
      <main>
        <OnboardingWizard />
      </main>,
    );
    await validateRenderedUi(container);
  });
});
