import type { FamilyMember } from "@/shared/api/family";

import { Button, Modal, Typography } from "@/shared/ui";

interface FamilyMemberArchiveModalProps {
  readonly member: FamilyMember | null;
  readonly isPending: boolean;
  readonly onClose: () => void;
  readonly onConfirm: (memberId: string) => void;
}

export function FamilyMemberArchiveModal({
  member,
  isPending,
  onClose,
  onConfirm,
}: FamilyMemberArchiveModalProps) {
  if (member === null) {
    return null;
  }

  return (
    <Modal
      open
      title="Архівувати учасника?"
      description="Профіль зникне з активного списку, але історичні записи буде збережено."
      onClose={() => {
        if (!isPending) {
          onClose();
        }
      }}
      footer={
        <>
          <Button type="button" variant="secondary" disabled={isPending} onClick={onClose}>
            Скасувати
          </Button>

          <Button
            type="button"
            variant="danger"
            isLoading={isPending}
            onClick={() => {
              onConfirm(member.id);
            }}
          >
            Архівувати
          </Button>
        </>
      }
    >
      <Typography variant="supporting">
        Архівація доступна лише для профілю без власного облікового запису. Ця дія не видаляє
        історичні дані фізично.
      </Typography>
    </Modal>
  );
}
