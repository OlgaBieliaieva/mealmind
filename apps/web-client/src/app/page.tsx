import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Головна",
};

const plannedCapabilities = [
  {
    title: "Знайти страву",
    description: "Пошук продуктів і рецептів для повсякденного сімейного харчування.",
  },
  {
    title: "Спланувати харчування",
    description: "Планування прийомів їжі та порцій для учасників родини.",
  },
  {
    title: "Підготувати покупки",
    description: "Формування редагованого списку покупок на основі плану.",
  },
  {
    title: "Відстежити споживання",
    description: "Порівняння запланованого та фактичного споживання.",
  },
] as const;

export default function Home() {
  return (
    <section className="client-page" aria-labelledby="home-title">
      <header className="client-hero">
        <p className="client-hero__eyebrow">MealMind для родини</p>

        <h1 id="home-title">Плануйте харчування без зайвої складності</h1>

        <p className="client-hero__description">
          Єдиний простір для пошуку страв, сімейного плану, покупок і контролю фактичного
          споживання.
        </p>
      </header>

      <section aria-labelledby="capabilities-title">
        <h2 id="capabilities-title">Можливості MealMind</h2>

        <ul className="client-capability-grid">
          {plannedCapabilities.map((capability) => (
            <li key={capability.title}>
              <article className="client-capability-card">
                <h3>{capability.title}</h3>
                <p>{capability.description}</p>
                <p className="client-capability-card__status">Функція готується</p>
              </article>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
