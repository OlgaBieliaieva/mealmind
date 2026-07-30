import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Огляд",
};

const plannedModules = [
  {
    title: "Довідники",
    description: "Категорії, бренди, нутрієнти, кухні та інші контрольовані значення.",
  },
  {
    title: "Продукти",
    description: "Створення, перевірка та керування generic і branded продуктами.",
  },
  {
    title: "Рецепти",
    description: "Керування рецептами, інгредієнтами, кроками та поживною цінністю.",
  },
] as const;

export default function Home() {
  return (
    <section className="admin-page" aria-labelledby="dashboard-title">
      <header className="admin-page__header">
        <p className="admin-page__eyebrow">Панель керування</p>

        <h1 id="dashboard-title">Огляд MealMind Admin</h1>

        <p className="admin-page__description">
          Адміністративні інструменти для підтримки каталогу продуктів, рецептів і довідникових
          даних MealMind.
        </p>
      </header>

      <section aria-labelledby="modules-title">
        <h2 id="modules-title">Заплановані модулі</h2>

        <ul className="admin-module-grid">
          {plannedModules.map((module) => (
            <li key={module.title}>
              <article className="admin-module-card">
                <h3>{module.title}</h3>
                <p>{module.description}</p>
                <p className="admin-module-card__status">Буде додано пізніше</p>
              </article>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
