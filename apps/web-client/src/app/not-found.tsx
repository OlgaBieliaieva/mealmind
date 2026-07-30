import Link from "next/link";

import { PageState } from "@/shared/ui";

export default function NotFound() {
  return (
    <PageState
      kind="empty"
      headingLevel={1}
      title="Сторінку не знайдено"
      description="Запитана сторінка не існує або була переміщена."
      visual="🔎"
      actions={
        <Link className="ui-button ui-button--primary" href="/">
          На головну
        </Link>
      }
    />
  );
}
