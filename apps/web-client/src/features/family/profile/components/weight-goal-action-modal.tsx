"use client";

import { Button, Modal, Typography } from "@/shared/ui";

export type WeightGoalAction = "complete" | "cancel";

interface WeightGoalActionModalProps {
  readonly open: boolean;
  readonly action: WeightGoalAction;
  readonly isPending: boolean;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
}

const actionContent = {
  complete: {
    title: "Завершити ціль?",
    description: "Поточна ціль буде позначена як виконана та перестане бути активною.",
    message: "Ціль залишиться в історії профілю. Після цього ви зможете встановити нову.",
    confirmLabel: "Позначити виконаною",
    variant: "primary" as const,
  },

  cancel: {
    title: "Скасувати ціль?",
    description: "Поточна ціль перестане бути активною.",
    message:
      "Скасована ціль залишиться в історії профілю. Цю дію не потрібно використовувати для звичайної зміни параметрів цілі — для цього створюється нова ціль.",
    confirmLabel: "Скасувати ціль",
    variant: "danger" as const,
  },
} as const;

export function WeightGoalActionModal({
  open,
  action,
  isPending,
  onClose,
  onConfirm,
}: WeightGoalActionModalProps) {
  const content = actionContent[action];

  return (
    <Modal
      open={open}
      title={content.title}
      description={content.description}
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

          <Button type="button" variant={content.variant} isLoading={isPending} onClick={onConfirm}>
            {content.confirmLabel}
          </Button>
        </>
      }
    >
      <Typography variant="supporting">{content.message}</Typography>
    </Modal>
  );
}
