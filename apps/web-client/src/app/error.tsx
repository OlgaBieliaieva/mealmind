"use client";

export interface ErrorPageProps {
  readonly error: Error & {
    readonly digest?: string;
  };
  readonly reset: () => void;
}

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <main>
      <h1>Не вдалося завантажити сторінку</h1>
      <p role="alert">Сталася неочікувана помилка. Спробуйте повторити дію.</p>
      <button type="button" onClick={reset}>
        Спробувати ще раз
      </button>
    </main>
  );
}
