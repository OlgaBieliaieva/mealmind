import type { ReactNode } from "react";

import { Button, Typography } from "@/shared/ui";

interface EditablePreferenceRowProps {
  readonly title: string;
  readonly value: ReactNode;
  readonly onEdit?: () => void;
  readonly disabled?: boolean;
}

export function EditablePreferenceRow({
  title,
  value,
  onEdit,
  disabled = false,
}: EditablePreferenceRowProps) {
  return (
    <div className="profile-preference-row">
      <div className="profile-preference-row__content">
        <Typography variant="body">{title}</Typography>

        <Typography variant="supporting">{value}</Typography>
      </div>

      <Button type="button" onClick={onEdit} disabled={disabled}>
        Редагувати
      </Button>
    </div>
  );
}
