"use client";

export interface ErrorPageProps {
  readonly error: Error & {
    readonly digest?: string;
  };
  readonly reset: () => void;
}

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <section className="client-page-state" aria-labelledby="error-title">
      <h1 id="error-title">Не вдалося завантажити сторінку</h1>

      <p role="alert">Сталася неочікувана помилка. Спробуйте повторити дію.</p>

      <button className="client-page-state__button" type="button" onClick={reset}>
        Спробувати ще раз
      </button>
    </section>
  );
}
