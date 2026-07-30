import { PageState } from "@/shared/ui";

export default function Loading() {
  return (
    <PageState
      kind="loading"
      headingLevel={1}
      title="Завантаження панелі керування"
      description="Зачекайте, поки MealMind підготує адміністративні дані."
    />
  );
}
