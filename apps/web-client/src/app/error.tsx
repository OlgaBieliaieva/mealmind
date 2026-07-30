"use client";

import { Button, PageState } from "@/shared/ui";

export interface ErrorPageProps {
  readonly error: Error & {
    readonly digest?: string;
  };
  readonly reset: () => void;
}

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <PageState
      kind="error"
      headingLevel={1}
      title="Не вдалося завантажити сторінку"
      description="Сталася неочікувана помилка. Спробуйте повторити дію."
      visual="⚠️"
      actions={<Button onClick={reset}>Спробувати ще раз</Button>}
    />
  );
}
