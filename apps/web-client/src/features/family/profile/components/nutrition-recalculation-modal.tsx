"use client";

import { Button, Modal, Typography } from "@/shared/ui";

interface NutritionRecalculationModalProps {
  readonly open: boolean;

  readonly isPending: boolean;

  readonly onClose: () => void;

  readonly onConfirm: () => void;
}

export function NutritionRecalculationModal({
  open,
  isPending,
  onClose,
  onConfirm,
}: NutritionRecalculationModalProps) {
  return (
    <Modal
      open={open}
      title="Перерахувати рекомендації?"
      description="MealMind сформує новий набір рекомендованих показників за актуальними даними профілю."
      onClose={() => {
        if (!isPending) {
          onClose();
        }
      }}
      footer={
        <>
          <Button type="button" variant="secondary" disabled={isPending} onClick={onClose}>
            Назад
          </Button>

          <Button type="button" isLoading={isPending} onClick={onConfirm}>
            Розрахувати
          </Button>
        </>
      }
    >
      <Typography variant="supporting">
        Поточний набір буде збережено в історії, а новий набір стане актуальним. Власні значення не
        видаляються фізично з історичних записів.
      </Typography>
    </Modal>
  );
}
