import Link from "next/link";

export default function NotFound() {
  return (
    <section className="admin-page-state" aria-labelledby="not-found-title">
      <h1 id="not-found-title">Сторінку не знайдено</h1>
      <p>Запитаний розділ панелі керування не існує.</p>
      <Link className="admin-page-state__link" href="/">
        До панелі керування
      </Link>
    </section>
  );
}
