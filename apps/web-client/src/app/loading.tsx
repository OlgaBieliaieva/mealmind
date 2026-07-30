import { PageState } from "@/shared/ui";

export default function Loading() {
  return (
    <PageState
      kind="loading"
      headingLevel={1}
      title="Завантаження MealMind"
      description="Зачекайте, поки ми підготуємо сторінку."
    />
  );
}
