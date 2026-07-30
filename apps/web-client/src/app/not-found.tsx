import Link from "next/link";

export default function NotFound() {
  return (
    <main>
      <h1>Сторінку не знайдено</h1>
      <p>Перевірте адресу або поверніться на головну сторінку.</p>
      <Link href="/">На головну</Link>
    </main>
  );
}
