import Link from "next/link";

export default function NotFound() {
  return (
    <main>
      <h1>Сторінку не знайдено</h1>
      <p>Запитаний розділ панелі керування не існує.</p>
      <Link href="/">До панелі керування</Link>
    </main>
  );
}
