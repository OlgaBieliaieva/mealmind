"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export interface GlobalErrorProps {
  readonly error: Error & {
    readonly digest?: string;
  };
  readonly reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="uk">
      <body>
        <main>
          <h1>MealMind тимчасово недоступний</h1>
          <p role="alert">Не вдалося відобразити застосунок.</p>
          <button type="button" onClick={reset}>
            Спробувати ще раз
          </button>
        </main>
      </body>
    </html>
  );
}
