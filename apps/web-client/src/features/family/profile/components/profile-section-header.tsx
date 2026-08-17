import { Button, Typography } from "@/shared/ui";

interface ProfileSectionHeaderProps {
  readonly title: string;
  readonly description: string;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
  readonly actionDisabled?: boolean;
}

export function ProfileSectionHeader({
  title,
  description,
  actionLabel,
  onAction,
  actionDisabled = false,
}: ProfileSectionHeaderProps) {
  return (
    <header className="profile-section__header">
      <div className="profile-section__heading">
        <Typography as="h2" variant="section-title">
          {title}
        </Typography>

        <Typography variant="supporting">{description}</Typography>
      </div>

      {actionLabel === undefined ? null : (
        <Button type="button" disabled={actionDisabled} onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </header>
  );
}
