import Link from "next/link";

export default function NotFound() {
  return (
    <section className="client-page-state" aria-labelledby="not-found-title">
      <h1 id="not-found-title">Сторінку не знайдено</h1>

      <p>Запитана сторінка не існує або була переміщена.</p>

      <Link className="client-page-state__link" href="/">
        На головну
      </Link>
    </section>
  );
}
