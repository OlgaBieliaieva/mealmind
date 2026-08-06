"use client";
import type { RecipeStatus } from "@/shared/api/recipes";
import { Button } from "@/shared/ui";
import { RECIPE_STATUS_LABELS } from "./recipe-labels";
const transitions: Readonly<Record<RecipeStatus, readonly RecipeStatus[]>> = {
  DRAFT: ["READY"],
  READY: ["DRAFT", "PUBLISHED"],
  PUBLISHED: ["ARCHIVED"],
  ARCHIVED: ["DRAFT"],
};
export function RecipeStatusActions({
  status,
  isPending,
  onChange,
}: {
  readonly status: RecipeStatus;
  readonly isPending: boolean;
  readonly onChange: (status: RecipeStatus) => void;
}) {
  return (
    <section className="recipe-status-actions" aria-labelledby="recipe-status-title">
      <div>
        <h2 id="recipe-status-title">Статус рецепта</h2>
        <p>
          <span className={`recipe-status recipe-status--${status.toLowerCase()}`}>
            {RECIPE_STATUS_LABELS[status]}
          </span>
        </p>
      </div>
      <div className="recipe-status-actions__buttons">
        {transitions[status].map((target) => (
          <Button
            key={target}
            variant={target === "PUBLISHED" ? "primary" : "secondary"}
            disabled={isPending}
            onClick={() => onChange(target)}
          >
            {RECIPE_STATUS_LABELS[target]}
          </Button>
        ))}
      </div>
    </section>
  );
}
