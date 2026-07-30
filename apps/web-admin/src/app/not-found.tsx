import Link from "next/link";

import { PageState } from "@/shared/ui";

export default function NotFound() {
  return (
    <PageState
      kind="empty"
      headingLevel={1}
      title="Сторінку не знайдено"
      description="Запитаний розділ панелі керування не існує."
      actions={
        <Link className="ui-button ui-button--primary" href="/">
          До панелі керування
        </Link>
      }
    />
  );
}
